import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { LobbyClient } from "./_components/LobbyClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const room = await prisma.room.findUnique({ where: { code: codigo } });
  return { title: room ? `Sala: ${room.name}` : "Sala" };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const session = await getServerSession(authOptions);

  const room = await prisma.room.findUnique({
    where: { code: codigo },
    include: {
      admin: { select: { id: true, displayName: true } },
      tournament: {
        include: {
          players: {
            include: {
              player: { select: { id: true, displayName: true, user: { select: { avatar: true } } } },
            },
            orderBy: { seed: "asc" },
          },
        },
      },
    },
  });

  if (!room) notFound();

  const playerId = (session?.user as any)?.playerId as string | null;

  return (
    <LobbyClient
      room={{
        id: room.id,
        code: room.code,
        name: room.name,
        maxPlayers: room.maxPlayers,
        status: room.status,
        adminId: room.admin.id,
        adminName: room.admin.displayName,
        adminIsSpectator: room.adminIsSpectator,
      }}
      tournament={room.tournament ?? null}
      currentPlayerId={playerId}
    />
  );
}
