import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { Flame, Trophy } from "lucide-react";

export const metadata: Metadata = { title: "Ranking Global" };

const MEDAL_COLOR: Record<number, string> = {
  0: "#F59E0B",
  1: "#CBD5E1",
  2: "#D97706",
};

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  const currentPlayerId = (session?.user as any)?.playerId as string | null;

  const rankings = await prisma.ranking.findMany({
    orderBy: [{ totalPoints: "desc" }, { matchesWon: "desc" }],
    take: 50,
    include: {
      player: {
        select: {
          id: true,
          displayName: true,
          user: { select: { username: true, avatar: true } },
        },
      },
    },
  });

  const myPosition = rankings.findIndex((r) => r.player.id === currentPlayerId);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Ranking Global</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Top {rankings.length} jugadores
        </p>
      </div>

      {/* Mi posición */}
      {myPosition >= 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <div className="text-2xl font-black" style={{ color: "var(--primary)" }}>
            #{myPosition + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--muted)" }}>
              Tu posición
            </p>
            <p className="font-bold text-white truncate">{rankings[myPosition].player.displayName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-black" style={{ color: "var(--primary)" }}>
              {rankings[myPosition].totalPoints.toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>puntos</div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        {/* Encabezado */}
        <div
          className="grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-2 px-4 py-3 text-xs font-bold tracking-widest uppercase"
          style={{ background: "var(--bg-raised)", color: "var(--muted)", borderBottom: "1px solid var(--bg-raised)" }}
        >
          <div>#</div>
          <div>Jugador</div>
          <div className="text-right">Puntos</div>
          <div className="text-right">V/J</div>
        </div>

        {rankings.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: "var(--muted)" }}>
            Aún no hay jugadores en el ranking
          </div>
        ) : (
          rankings.map((r, i) => {
            const isMe = r.player.id === currentPlayerId;
            const winRate = r.matchesPlayed > 0 ? Math.round((r.matchesWon / r.matchesPlayed) * 100) : 0;

            return (
              <Link
                key={r.id}
                href={`/perfil/${r.player.user.username}`}
                className="grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-2 px-4 py-3.5 transition-all active:scale-[0.99]"
                style={{
                  borderBottom: i < rankings.length - 1 ? "1px solid var(--bg-raised)" : undefined,
                  background: isMe ? "rgba(59,130,246,0.06)" : undefined,
                }}
              >
                {/* Posición */}
                <div className="flex items-center">
                  {i < 3 ? (
                    <Trophy className="w-4 h-4" style={{ color: MEDAL_COLOR[i] }} />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: isMe ? "var(--primary)" : "var(--muted)" }}>
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Jugador */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.player.user.avatar ? (
                    <img src={r.player.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{
                        background: isMe ? "rgba(59,130,246,0.2)" : "var(--bg-raised)",
                        color: isMe ? "var(--primary)" : "var(--muted)",
                      }}
                    >
                      {r.player.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: isMe ? "var(--primary)" : "var(--text)" }}
                    >
                      {r.player.displayName}
                      {isMe && <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>(tú)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                      @{r.player.user.username}
                      {r.maxWinStreak >= 3 && (
                        <span className="inline-flex items-center gap-0.5 text-orange-400">
                          <Flame className="w-3 h-3" />{r.maxWinStreak}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Puntos */}
                <div className="flex items-center justify-end">
                  <span
                    className="text-sm font-black"
                    style={{
                      color: i < 3 ? MEDAL_COLOR[i] : isMe ? "var(--primary)" : "var(--text)",
                    }}
                  >
                    {r.totalPoints.toLocaleString()}
                  </span>
                </div>

                {/* V/J */}
                <div className="flex items-center justify-end gap-0.5 text-sm">
                  <span className="text-emerald-400 font-bold">{r.matchesWon}</span>
                  <span style={{ color: "var(--muted)" }}>/</span>
                  <span style={{ color: "var(--muted)" }}>{r.matchesPlayed}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
