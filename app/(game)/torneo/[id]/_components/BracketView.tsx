"use client";

import { motion } from "framer-motion";
import { Check, Trophy, Zap, Flame, Target } from "lucide-react";

type MatchPlayer = { player: { id: string; displayName: string } };
type Score = { playerId: string; totalPoints: number; player: { displayName: string } };
type Match = {
  id: string;
  status: string;
  winnerId: string | null;
  players: MatchPlayer[];
  scores: Score[];
};
type Round = { id: string; number: number; name: string; status: string; matches: Match[] };

function MatchCard({ match, currentPlayerId }: { match: Match; currentPlayerId: string | null }) {
  const p1 = match.players[0]?.player;
  const p2 = match.players[1]?.player;
  const s1 = match.scores.find((s) => s.playerId === p1?.id);
  const s2 = match.scores.find((s) => s.playerId === p2?.id);
  const isMyMatch = match.players.some((p) => p.player.id === currentPlayerId);

  const borderColor =
    match.status === "VOTING" ? "rgba(59,130,246,0.4)" :
    match.status === "IN_PROGRESS" ? "rgba(245,158,11,0.4)" :
    match.status === "TIEBREAK" ? "rgba(249,115,22,0.4)" :
    match.status === "FINISHED" ? "var(--bg-raised)" :
    "var(--bg-raised)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-3 min-w-[180px]"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${borderColor}`,
        boxShadow: isMyMatch ? `0 0 0 1px rgba(59,130,246,0.3)` : undefined,
      }}
    >
      {/* Estado */}
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
        {match.status === "PENDING" && "Pendiente"}
        {match.status === "VOTING" && <span className="inline-flex items-center gap-0.5" style={{ color: "var(--primary)" }}><Zap className="w-3 h-3" /> Votando</span>}
        {match.status === "IN_PROGRESS" && <span className="inline-flex items-center gap-0.5" style={{ color: "var(--secondary)" }}><Flame className="w-3 h-3" /> En curso</span>}
        {match.status === "TIEBREAK" && <span className="inline-flex items-center gap-0.5 text-orange-400"><Target className="w-3 h-3" /> Desempate</span>}
        {match.status === "FINISHED" && <span className="inline-flex items-center gap-0.5 text-emerald-400"><Check className="w-3 h-3" /> Finalizado</span>}
      </div>

      <PlayerRow
        displayName={p1?.displayName ?? "TBD"}
        points={s1?.totalPoints}
        isWinner={match.winnerId === p1?.id}
        isMe={p1?.id === currentPlayerId}
        matchFinished={match.status === "FINISHED"}
      />

      <div className="my-1.5" style={{ borderTop: "1px solid var(--bg-raised)" }}>
        <span className="text-[10px] px-2" style={{ color: "var(--muted)" }}>VS</span>
      </div>

      <PlayerRow
        displayName={p2?.displayName ?? "TBD"}
        points={s2?.totalPoints}
        isWinner={match.winnerId === p2?.id}
        isMe={p2?.id === currentPlayerId}
        matchFinished={match.status === "FINISHED"}
      />
    </motion.div>
  );
}

function PlayerRow({
  displayName,
  points,
  isWinner,
  isMe,
  matchFinished,
}: {
  displayName: string;
  points?: number;
  isWinner: boolean;
  isMe: boolean;
  matchFinished: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
      style={{
        background: matchFinished && isWinner ? "rgba(16,185,129,0.1)" : undefined,
        opacity: matchFinished && !isWinner && points !== undefined ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {matchFinished && isWinner && <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />}
        <span
          className="text-sm truncate"
          style={{
            color: isWinner ? "white" : isMe ? "var(--primary)" : "var(--muted)",
            fontWeight: isWinner || isMe ? 700 : 400,
          }}
        >
          {displayName}
          {isMe && <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>(tú)</span>}
        </span>
      </div>
      {points !== undefined && matchFinished && (
        <span className="text-xs font-mono font-black flex-shrink-0" style={{ color: isWinner ? "#10B981" : "var(--muted)" }}>
          {points}
        </span>
      )}
    </div>
  );
}

export function BracketView({
  rounds,
  currentPlayerId,
  roundLabels,
}: {
  rounds: Round[];
  currentPlayerId: string | null;
  roundLabels: Record<string, string>;
}) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
        El torneo aún no ha comenzado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map((round) => (
          <div key={round.id} className="flex flex-col gap-3">
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {roundLabels[round.name] ?? round.name}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                {round.matches.length} enfrentamiento{round.matches.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div
              className="flex flex-col gap-4 justify-around"
              style={{ minHeight: `${Math.max(round.matches.length, 1) * 120}px` }}
            >
              {round.matches.map((match) => (
                <MatchCard key={match.id} match={match} currentPlayerId={currentPlayerId} />
              ))}
            </div>
          </div>
        ))}

        {rounds.length > 0 && rounds[rounds.length - 1].status === "FINISHED" && (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
              Campeón
            </div>
            <Trophy className="w-14 h-14" style={{ color: "var(--secondary)" }} />
          </div>
        )}
      </div>
    </div>
  );
}
