import type { Server, Socket } from "socket.io";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export function registerRoomHandlers(io: Server, socket: Socket) {
  // Unirse al room (jugador o espectador)
  socket.on(
    "room:join",
    async ({
      roomCode,
      playerId,
      spectatorOnly,
    }: {
      roomCode: string;
      playerId: string;
      spectatorOnly?: boolean;
    }) => {
      socket.join(`room:${roomCode}`);

      if (spectatorOnly) {
        // Solo unirse al socket room para recibir actualizaciones, sin registrar como jugador
        const updatedPlayers = await getPlayersInRoom(roomCode);
        socket.emit("room:updated", { players: updatedPlayers });
        return;
      }

      const room = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { tournament: true },
      });

      if (!room) return;

      // No registrar al admin como jugador si eligió ser espectador
      if (room.adminIsSpectator && playerId === room.adminId) {
        const updatedPlayers = await getPlayersInRoom(roomCode);
        socket.emit("room:updated", { players: updatedPlayers });
        return;
      }

      // Crear torneo PENDING si todavía no existe
      let tournament = room.tournament;
      if (!tournament) {
        tournament = await prisma.tournament.create({
          data: { roomId: room.id, status: "PENDING" },
        });
      }

      // Agregar jugador si no está ya y la sala no está llena ni en curso
      if (room.status === "WAITING" || room.status === "FULL") {
        const exists = await prisma.tournamentPlayer.findUnique({
          where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        });

        if (!exists) {
          const count = await prisma.tournamentPlayer.count({
            where: { tournamentId: tournament.id },
          });
          if (count < room.maxPlayers) {
            await prisma.tournamentPlayer.create({
              data: { tournamentId: tournament.id, playerId, seed: count + 1, isReady: false },
            });
            if (count + 1 >= room.maxPlayers) {
              await prisma.room.update({ where: { id: room.id }, data: { status: "FULL" } });
            }
          }
        }
      }

      const updatedPlayers = await getPlayersInRoom(roomCode);
      io.to(`room:${roomCode}`).emit("room:updated", { players: updatedPlayers });
    }
  );

  // Admin elige ser espectador
  socket.on(
    "room:setSpectator",
    async ({ roomCode, adminId }: { roomCode: string; adminId: string }) => {
      const room = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!room || room.adminId !== adminId) return;

      await prisma.room.update({
        where: { code: roomCode },
        data: { adminIsSpectator: true },
      });

      socket.join(`room:${roomCode}`);
      const updatedPlayers = await getPlayersInRoom(roomCode);
      socket.emit("room:updated", { players: updatedPlayers });
    }
  );

  // Admin elige jugar (resetea a espectador=false si había elegido antes)
  socket.on(
    "room:setPlayer",
    async ({ roomCode, adminId }: { roomCode: string; adminId: string }) => {
      const room = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { tournament: true },
      });
      if (!room || room.adminId !== adminId) return;

      await prisma.room.update({
        where: { code: roomCode },
        data: { adminIsSpectator: false },
      });

      // Registrar al admin como jugador
      let tournament = room.tournament;
      if (!tournament) {
        tournament = await prisma.tournament.create({
          data: { roomId: room.id, status: "PENDING" },
        });
      }

      if (room.status === "WAITING" || room.status === "FULL") {
        const exists = await prisma.tournamentPlayer.findUnique({
          where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: adminId } },
        });
        if (!exists) {
          const count = await prisma.tournamentPlayer.count({ where: { tournamentId: tournament.id } });
          if (count < room.maxPlayers) {
            await prisma.tournamentPlayer.create({
              data: { tournamentId: tournament.id, playerId: adminId, seed: count + 1, isReady: false },
            });
          }
        }
      }

      socket.join(`room:${roomCode}`);
      const updatedPlayers = await getPlayersInRoom(roomCode);
      io.to(`room:${roomCode}`).emit("room:updated", { players: updatedPlayers });
    }
  );

  // Salir de sala
  socket.on(
    "room:leave",
    async ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
      socket.leave(`room:${roomCode}`);
      const updatedPlayers = await getPlayersInRoom(roomCode);
      io.to(`room:${roomCode}`).emit("room:updated", { players: updatedPlayers });
    }
  );

  // Marcar listo
  socket.on(
    "room:ready",
    async ({ roomCode, playerId, isReady }: { roomCode: string; playerId: string; isReady: boolean }) => {
      const room = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { tournament: true },
      });
      if (!room?.tournament) return;

      await prisma.tournamentPlayer.updateMany({
        where: { tournamentId: room.tournament.id, playerId },
        data: { isReady },
      });

      const updatedPlayers = await getPlayersInRoom(roomCode);
      io.to(`room:${roomCode}`).emit("room:updated", { players: updatedPlayers });
    }
  );

  // Iniciar torneo
  socket.on(
    "tournament:start",
    async ({ roomCode, adminId }: { roomCode: string; adminId: string }) => {
      const room = await prisma.room.findUnique({
        where: { code: roomCode, adminId },
        include: { tournament: { include: { players: true } } },
      });

      if (!room?.tournament) return;

      const players = room.tournament.players;
      if (players.length < 2) return;

      const tournament = await startTournament(room.tournament.id, players);

      await prisma.room.update({
        where: { id: room.id },
        data: { status: "IN_PROGRESS" },
      });

      io.to(`room:${roomCode}`).emit("tournament:started", {
        tournamentId: tournament.id,
      });
    }
  );
}

async function getPlayersInRoom(roomCode: string) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      tournament: {
        include: {
          players: {
            include: {
              player: {
                select: {
                  id: true,
                  displayName: true,
                  user: { select: { avatar: true } },
                },
              },
            },
            orderBy: { seed: "asc" },
          },
        },
      },
    },
  });

  return room?.tournament?.players ?? [];
}

async function startTournament(tournamentId: string, players: { playerId: string; seed: number }[]) {
  const count = players.length;

  const roundNameMap: Record<number, string> = {
    32: "ROUND_OF_32",
    16: "ROUND_OF_16",
    8: "QUARTERFINALS",
    4: "SEMIFINALS",
    2: "FINAL",
  };

  const roundName = (roundNameMap[count] ?? "ROUND_OF_32") as any;
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  const round = await prisma.round.create({
    data: { tournamentId, number: 1, name: roundName, status: "IN_PROGRESS" },
  });

  for (let i = 0; i < shuffled.length; i += 2) {
    await prisma.match.create({
      data: {
        roundId: round.id,
        status: "VOTING",
        players: {
          create: [
            { playerId: shuffled[i].playerId, bracket: 1 },
            { playerId: shuffled[i + 1].playerId, bracket: 2 },
          ],
        },
        scores: {
          create: [
            { playerId: shuffled[i].playerId },
            { playerId: shuffled[i + 1].playerId },
          ],
        },
      },
    });
  }

  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
}
