import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { ProfileClient } from "../_components/ProfileClient";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      player: {
        select: {
          id: true,
          displayName: true,
          ranking: true,
          matchPlayers: {
            where: { match: { status: "FINISHED" } },
            orderBy: { match: { finishedAt: "desc" } },
            take: 10,
            select: {
              match: {
                select: {
                  id: true,
                  finishedAt: true,
                  winnerId: true,
                  round: { select: { name: true } },
                  players: {
                    select: {
                      playerId: true,
                      player: { select: { displayName: true } },
                    },
                  },
                  scores: {
                    select: { playerId: true, totalPoints: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.player) notFound();

  const { player } = user;
  const ranking = player.ranking;
  const isOwnProfile = (session?.user as any)?.username === username;

  // Build ranking position
  let rankPosition: number | null = null;
  if (ranking) {
    const position = await prisma.ranking.count({
      where: {
        OR: [
          { totalPoints: { gt: ranking.totalPoints } },
          {
            totalPoints: ranking.totalPoints,
            matchesWon: { gt: ranking.matchesWon },
          },
        ],
      },
    });
    rankPosition = position + 1;
  }

  // Build recent matches
  const recentMatches = player.matchPlayers.map(({ match }) => {
    const opponent = match.players.find((p) => p.playerId !== player.id);
    const myScore = match.scores.find((s) => s.playerId === player.id);
    return {
      id: match.id,
      finishedAt: match.finishedAt,
      won: match.winnerId === player.id,
      points: myScore?.totalPoints ?? 0,
      opponentName: opponent?.player.displayName ?? "Desconocido",
      roundName: match.round.name,
    };
  });

  return (
    <ProfileClient
      displayName={player.displayName}
      username={user.username}
      avatar={user.avatar}
      stats={
        ranking
          ? {
              totalPoints: ranking.totalPoints,
              matchesPlayed: ranking.matchesPlayed,
              matchesWon: ranking.matchesWon,
              tournamentsWon: ranking.tournamentsWon,
              maxWinStreak: ranking.maxWinStreak,
              winStreak: ranking.winStreak,
            }
          : null
      }
      recentMatches={recentMatches}
      rankPosition={rankPosition}
      isOwnProfile={isOwnProfile}
    />
  );
}
