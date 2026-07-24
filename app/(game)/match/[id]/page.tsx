import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { MatchClient } from "./_components/MatchClient";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const playerId = (session?.user as any)?.playerId as string | null;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      round: {
        select: {
          name: true,
          number: true,
          tournamentId: true,
        },
      },
      category: { select: { id: true, name: true, icon: true, color: true } },
      players: {
        include: {
          player: { select: { id: true, displayName: true } },
        },
      },
      scores: {
        include: { player: { select: { displayName: true } } },
        orderBy: { totalPoints: "desc" },
      },
      wildcards: { select: { playerId: true } },
    },
  });

  if (!match) notFound();

  // Verificar que el jugador pertenece a este match
  const isParticipant = match.players.some((p) => p.player.id === playerId);
  if (!isParticipant) {
    redirect(`/torneo/${match.round.tournamentId}`);
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, icon: true, color: true },
  });

  const opponent = match.players.find((p) => p.player.id !== playerId);
  const wildcardUsed = match.wildcards.some((w) => w.playerId === playerId);

  return (
    <MatchClient
      match={{
        id: match.id,
        status: match.status,
        tournamentId: match.round.tournamentId,
        roundName: match.round.name,
        category: match.category,
        scores: match.scores.map((s) => ({
          playerId: s.playerId,
          displayName: s.player.displayName,
          totalPoints: s.totalPoints,
        })),
        winnerId: match.winnerId,
      }}
      categories={categories}
      currentPlayerId={playerId!}
      opponentName={opponent?.player.displayName ?? "Oponente"}
      wildcardUsed={wildcardUsed}
    />
  );
}
