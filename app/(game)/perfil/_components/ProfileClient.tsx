"use client";

import { useState } from "react";
import { EditProfileModal } from "./EditProfileModal";
import { Trophy, Flame, Pencil } from "lucide-react";

type Stats = {
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  tournamentsWon: number;
  maxWinStreak: number;
  winStreak: number;
};

type RecentMatch = {
  id: string;
  finishedAt: Date | null;
  won: boolean;
  points: number;
  opponentName: string;
  roundName: string;
};

export function ProfileClient({
  displayName,
  username,
  avatar,
  stats,
  recentMatches,
  rankPosition,
  isOwnProfile,
}: {
  displayName: string;
  username: string;
  avatar: string | null;
  stats: Stats | null;
  recentMatches: RecentMatch[];
  rankPosition: number | null;
  isOwnProfile: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  const winRate =
    stats && stats.matchesPlayed > 0
      ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
      : 0;

  const ROUND_LABELS: Record<string, string> = {
    ROUND_OF_32: "32avos",
    ROUND_OF_16: "Octavos",
    QUARTERFINALS: "Cuartos",
    SEMIFINALS: "Semis",
    FINAL: "Final",
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
        >
          <div className="flex items-start gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                style={{ border: "2px solid var(--bg-raised)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black flex-shrink-0"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  color: "var(--primary)",
                  border: "2px solid var(--bg-raised)",
                }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white truncate">{displayName}</h1>
                {stats?.tournamentsWon ? (
                  <span
                    className="text-xs font-bold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)", color: "var(--secondary)" }}
                  >
                    <Trophy className="w-3 h-3" /> {stats.tournamentsWon}
                  </span>
                ) : null}
              </div>
              <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>@{username}</p>

              {rankPosition !== null && (
                <div
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <span className="font-black text-sm" style={{ color: "var(--primary)" }}>#{rankPosition}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>en el ranking</span>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex-shrink-0 rounded-xl p-2.5 transition-all active:scale-95"
                style={{ background: "var(--bg-raised)", color: "var(--muted)" }}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Puntos" value={stats.totalPoints.toLocaleString()} accent />
            <StatCard label="Victorias" value={`${winRate}%`} />
            <StatCard label="V/J" value={`${stats.matchesWon}/${stats.matchesPlayed}`} />
            <StatCard label="Racha" value={`${stats.maxWinStreak}`} streak={stats.maxWinStreak >= 3} />
          </div>
        ) : (
          <div
            className="rounded-xl p-8 text-center text-sm"
            style={{ background: "var(--bg-card)", color: "var(--muted)" }}
          >
            Este jugador todavía no ha participado en ningún torneo.
          </div>
        )}

        {/* Historial */}
        {recentMatches.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--bg-raised)" }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
                Últimas partidas
              </h2>
            </div>
            {recentMatches.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < recentMatches.length - 1 ? "1px solid var(--bg-raised)" : undefined }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{
                    background: m.won ? "rgba(16,185,129,0.15)" : "var(--bg-raised)",
                    color: m.won ? "#10B981" : "var(--muted)",
                  }}
                >
                  {m.won ? "V" : "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">vs {m.opponentName}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {ROUND_LABELS[m.roundName] ?? m.roundName}
                    {m.finishedAt && (
                      <>
                        {" · "}
                        {new Date(m.finishedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-sm font-black" style={{ color: m.won ? "#10B981" : "var(--muted)" }}>
                  {m.points > 0 ? `+${m.points}` : m.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          currentDisplayName={displayName}
          currentAvatar={avatar}
        />
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
  streak,
}: {
  label: string;
  value: string;
  accent?: boolean;
  streak?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
    >
      <div
        className="text-2xl font-black inline-flex items-center gap-1 justify-center"
        style={{ color: accent ? "var(--primary)" : "var(--text)" }}
      >
        {streak && <Flame className="w-5 h-5 text-orange-400" />}
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
