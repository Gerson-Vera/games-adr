import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { TournamentClient } from "./_components/TournamentClient";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const playerId = (session?.user as any)?.playerId as string | null;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      room: { select: { name: true, code: true, adminId: true, adminIsSpectator: true } },
      rounds: {
        orderBy: { number: "asc" },
        include: {
          matches: {
            include: {
              players: {
                include: {
                  player: { select: { id: true, displayName: true } },
                },
              },
              scores: {
                orderBy: { totalPoints: "desc" },
                include: { player: { select: { displayName: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  // Admin espectador: no está como TournamentPlayer, ve el panel de control
  const isSpectatorAdmin =
    tournament.room.adminId === playerId &&
    tournament.room.adminIsSpectator;

  // Buscar match activo del jugador actual (solo si no es espectador)
  const activeMatch = isSpectatorAdmin
    ? null
    : tournament.rounds
        .flatMap((r) => r.matches)
        .find(
          (m) =>
            (m.status === "VOTING" || m.status === "IN_PROGRESS" || m.status === "TIEBREAK") &&
            m.players.some((p) => p.player.id === playerId)
        );

  return (
    <TournamentClient
      tournament={tournament}
      currentPlayerId={playerId}
      activeMatchId={activeMatch?.id ?? null}
      isSpectatorAdmin={isSpectatorAdmin}
    />
  );
}
