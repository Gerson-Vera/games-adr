"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/app/lib/socket-client";
import { Trophy, Eye, Swords, CheckCircle2, Clock, XCircle } from "lucide-react";

type LivePlayer = {
  playerId: string;
  displayName: string;
  answered: boolean;
  totalPoints: number;
  correctAnswers: number;
};

type LiveMatch = {
  matchId: string;
  roundName: string;
  status: string;
  questionIndex: number;
  totalQuestions: number;
  p1: LivePlayer;
  p2: LivePlayer;
  winnerId: string | null;
};

type Standing = {
  playerId: string;
  displayName: string;
  totalPoints: number;
  correctAnswers: number;
  matchesWon: number;
  matchesPlayed: number;
  isEliminated: boolean;
};

const ROUND_LABELS: Record<string, string> = {
  ROUND_OF_32: "32avos",
  ROUND_OF_16: "Octavos",
  QUARTERFINALS: "Cuartos",
  SEMIFINALS: "Semifinal",
  FINAL: "Final",
};

const STATUS_LABEL: Record<string, string> = {
  VOTING: "Votando categoría",
  IN_PROGRESS: "En juego",
  TIEBREAK: "Desempate",
  FINISHED: "Finalizado",
};

export function SpectatorDashboard({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [champion, setChampion] = useState<{ playerId: string; displayName: string } | null>(null);
  const [tab, setTab] = useState<"matches" | "standings">("matches");

  useEffect(() => {
    const socket = getSocket();
    socket.emit("spectator:join", { tournamentId });

    socket.on("spectator:liveUpdate", ({ matches: m, standings: s }: { matches: LiveMatch[]; standings: Standing[] }) => {
      setMatches(m);
      setStandings(s);
    });

    socket.on("tournament:champion", (data: { playerId: string; displayName: string }) => {
      setChampion(data);
    });

    return () => {
      socket.off("spectator:liveUpdate");
      socket.off("tournament:champion");
    };
  }, [tournamentId]);

  const activeMatches = matches.filter((m) => m.status !== "FINISHED");
  const finishedMatches = matches.filter((m) => m.status === "FINISHED");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4" style={{ color: "var(--secondary)" }} />
            <span className="text-xs font-black tracking-widest uppercase" style={{ color: "var(--secondary)" }}>
              Panel de Control
            </span>
          </div>
          <h1 className="text-xl font-black text-white">{tournamentName}</h1>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En vivo
        </div>
      </div>

      {/* Campeón */}
      <AnimatePresence>
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.3)" }}
          >
            <Trophy className="w-14 h-14 mx-auto mb-2" style={{ color: "var(--secondary)" }} />
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "var(--secondary)" }}>Campeón del Torneo</p>
            <p className="text-3xl font-black text-white">{champion.displayName}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["matches", "standings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-xl py-2.5 text-sm font-black transition-all"
            style={
              tab === t
                ? { background: "var(--primary)", color: "white" }
                : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--bg-raised)" }
            }
          >
            {t === "matches" ? `Partidas (${activeMatches.length} activas)` : "Clasificación"}
          </button>
        ))}
      </div>

      {/* PARTIDAS EN VIVO */}
      {tab === "matches" && (
        <div className="flex flex-col gap-3">
          {matches.length === 0 && (
            <div
              className="rounded-xl p-10 text-center text-sm"
              style={{ background: "var(--bg-card)", color: "var(--muted)" }}
            >
              Esperando que empiecen las partidas...
            </div>
          )}

          {activeMatches.map((m) => (
            <LiveMatchCard key={m.matchId} match={m} />
          ))}

          {finishedMatches.length > 0 && (
            <>
              <p className="text-xs font-bold tracking-widest uppercase px-1 mt-2" style={{ color: "var(--muted)" }}>
                Finalizadas
              </p>
              {finishedMatches.map((m) => (
                <LiveMatchCard key={m.matchId} match={m} />
              ))}
            </>
          )}
        </div>
      )}

      {/* CLASIFICACIÓN */}
      {tab === "standings" && (
        <StandingsTable standings={standings} />
      )}
    </div>
  );
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  const isActive = match.status !== "FINISHED";
  const isTiebreak = match.status === "TIEBREAK";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: `1.5px solid ${
          isTiebreak ? "rgba(249,115,22,0.4)" :
          isActive ? "rgba(59,130,246,0.25)" :
          "var(--bg-raised)"
        }`,
        opacity: match.status === "FINISHED" ? 0.7 : 1,
      }}
    >
      {/* Header match */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--bg-raised)" }}
      >
        <span className="text-xs font-black tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          {ROUND_LABELS[match.roundName] ?? match.roundName}
        </span>
        <div className="flex items-center gap-2">
          {isActive && match.status === "IN_PROGRESS" && (
            <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
              P {match.questionIndex + 1}/{match.totalQuestions}
            </span>
          )}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={
              isTiebreak ? { background: "rgba(249,115,22,0.15)", color: "#F97316" } :
              isActive ? { background: "rgba(59,130,246,0.12)", color: "var(--primary)" } :
              { background: "rgba(16,185,129,0.12)", color: "#10B981" }
            }
          >
            {STATUS_LABEL[match.status] ?? match.status}
          </span>
        </div>
      </div>

      {/* Jugadores */}
      <div className="px-4 py-3 flex flex-col gap-1">
        <PlayerRow
          player={match.p1}
          isWinner={match.winnerId === match.p1.playerId}
          isLoser={!!match.winnerId && match.winnerId !== match.p1.playerId}
          isActive={isActive && match.status === "IN_PROGRESS"}
          totalQuestions={match.totalQuestions}
        />

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px" style={{ background: "var(--bg-raised)" }} />
          <Swords className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
          <div className="flex-1 h-px" style={{ background: "var(--bg-raised)" }} />
        </div>

        <PlayerRow
          player={match.p2}
          isWinner={match.winnerId === match.p2.playerId}
          isLoser={!!match.winnerId && match.winnerId !== match.p2.playerId}
          isActive={isActive && match.status === "IN_PROGRESS"}
          totalQuestions={match.totalQuestions}
        />
      </div>

      {/* Barra de progreso de preguntas */}
      {match.status === "IN_PROGRESS" && (
        <div className="px-4 pb-3">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--primary)" }}
              animate={{ width: `${((match.questionIndex + 1) / match.totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function PlayerRow({
  player,
  isWinner,
  isLoser,
  isActive,
  totalQuestions,
}: {
  player: LivePlayer;
  isWinner: boolean;
  isLoser: boolean;
  isActive: boolean;
  totalQuestions: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2"
      style={{
        background: isWinner ? "rgba(16,185,129,0.1)" : isLoser ? "rgba(100,116,139,0.05)" : undefined,
        opacity: isLoser ? 0.6 : 1,
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{
          background: isWinner ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.15)",
          color: isWinner ? "#10B981" : "var(--primary)",
        }}
      >
        {player.displayName[0]?.toUpperCase()}
      </div>

      {/* Nombre y aciertos */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{player.displayName}</div>
        {isActive && (
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {player.correctAnswers} correctas
          </div>
        )}
      </div>

      {/* Puntos */}
      <div className="text-right flex-shrink-0">
        <div
          className="text-xl font-black tabular-nums"
          style={{ color: isWinner ? "#10B981" : "var(--text)" }}
        >
          {player.totalPoints}
        </div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>pts</div>
      </div>

      {/* Indicador respondió */}
      {isActive && (
        <div className="flex-shrink-0 ml-1">
          {player.answered ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <Clock className="w-5 h-5" style={{ color: "var(--secondary)" }} />
            </motion.div>
          )}
        </div>
      )}

      {isWinner && !isActive && (
        <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: "var(--secondary)" }} />
      )}
      {isLoser && !isActive && (
        <XCircle className="w-5 h-5 flex-shrink-0 text-red-400 opacity-50" />
      )}
    </div>
  );
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) {
    return (
      <div
        className="rounded-xl p-10 text-center text-sm"
        style={{ background: "var(--bg-card)", color: "var(--muted)" }}
      >
        La clasificación aparecerá cuando empiece el torneo
      </div>
    );
  }

  const MEDAL_COLOR: Record<number, string> = { 0: "#F59E0B", 1: "#CBD5E1", 2: "#D97706" };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[2rem_1fr_4rem_3rem_3rem] gap-2 px-4 py-3 text-xs font-black tracking-widest uppercase"
        style={{ background: "var(--bg-raised)", color: "var(--muted)" }}
      >
        <div>#</div>
        <div>Jugador</div>
        <div className="text-right">Pts</div>
        <div className="text-right">V/J</div>
        <div className="text-right">%</div>
      </div>

      {standings.map((s, i) => {
        const winRate = s.matchesPlayed > 0 ? Math.round((s.matchesWon / s.matchesPlayed) * 100) : 0;
        const isLeader = i === 0 && s.totalPoints > 0;

        return (
          <motion.div
            key={s.playerId}
            layout
            className="grid grid-cols-[2rem_1fr_4rem_3rem_3rem] gap-2 px-4 py-3.5 items-center"
            style={{
              borderBottom: i < standings.length - 1 ? "1px solid var(--bg-raised)" : undefined,
              background: isLeader ? "rgba(245,158,11,0.04)" : undefined,
              opacity: s.isEliminated ? 0.45 : 1,
            }}
          >
            {/* Posición */}
            <div className="flex items-center">
              {i < 3 && s.totalPoints > 0 ? (
                <span className="text-base font-black" style={{ color: MEDAL_COLOR[i] }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </span>
              ) : (
                <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>{i + 1}</span>
              )}
            </div>

            {/* Jugador */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: isLeader ? "rgba(245,158,11,0.2)" : "var(--bg-raised)",
                  color: isLeader ? "var(--secondary)" : "var(--muted)",
                }}
              >
                {s.displayName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{s.displayName}</div>
                {s.isEliminated && (
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Eliminado</div>
                )}
              </div>
            </div>

            {/* Puntos */}
            <div className="text-right">
              <span
                className="text-base font-black tabular-nums"
                style={{ color: i === 0 ? "var(--secondary)" : "var(--text)" }}
              >
                {s.totalPoints.toLocaleString()}
              </span>
            </div>

            {/* V/J */}
            <div className="text-right text-sm" style={{ color: "var(--muted)" }}>
              <span className="text-emerald-400 font-bold">{s.matchesWon}</span>
              /{s.matchesPlayed}
            </div>

            {/* % */}
            <div
              className="text-right text-xs font-bold tabular-nums"
              style={{ color: winRate >= 50 ? "#10B981" : "var(--muted)" }}
            >
              {winRate}%
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
