"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSound } from "@/app/lib/useSound";
import { Trophy, Check, X } from "lucide-react";

type Score = { playerId: string; displayName: string; totalPoints: number };

export function ResultPhase({
  scores,
  winner,
  currentPlayerId,
  tournamentId,
}: {
  scores: Score[];
  winner: Score | null;
  currentPlayerId: string;
  tournamentId: string;
}) {
  const iWon = winner?.playerId === currentPlayerId;
  const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
  const { play } = useSound();
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;

    if (iWon) {
      play("correct");
      setTimeout(() => play("win"), 400);

      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        try {
          (window as any).confetti?.({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
          (window as any).confetti?.({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        } catch {}
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else {
      play("wrong");
      setTimeout(() => play("lose"), 400);
    }
  }, [iWon]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
      {/* Banner resultado */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: iWon ? "rgba(245,158,11,0.08)" : "var(--bg-card)",
          border: `1.5px solid ${iWon ? "rgba(245,158,11,0.35)" : "var(--bg-raised)"}`,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-4 flex justify-center"
        >
          {iWon ? (
            <Trophy className="w-16 h-16" style={{ color: "var(--secondary)" }} />
          ) : (
            <X className="w-16 h-16 text-red-400" />
          )}
        </motion.div>
        <h2 className="text-3xl font-black" style={{ color: iWon ? "var(--secondary)" : "var(--muted)" }}>
          {iWon ? "¡Ganaste!" : "Derrota"}
        </h2>
        {winner && !iWon && (
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            {winner.displayName} ganó este enfrentamiento
          </p>
        )}
        {iWon && (
          <p className="text-sm mt-2 font-medium" style={{ color: "rgba(245,158,11,0.7)" }}>
            Avanzas a la siguiente ronda
          </p>
        )}
      </div>

      {/* Marcador */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--bg-raised)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Resultado final</h3>
        </div>
        {sorted.map((s, i) => {
          const isWinner = s.playerId === winner?.playerId;
          const isMe = s.playerId === currentPlayerId;
          return (
            <motion.div
              key={s.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="flex items-center gap-4 px-4 py-4"
              style={{
                borderBottom: i < sorted.length - 1 ? "1px solid var(--bg-raised)" : undefined,
                background: isWinner ? "rgba(245,158,11,0.05)" : undefined,
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{
                  background: isWinner ? "rgba(245,158,11,0.2)" : "var(--bg-raised)",
                  color: isWinner ? "var(--secondary)" : "var(--muted)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {s.displayName}
                  {isMe && <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>(tú)</span>}
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className="text-2xl font-black" style={{ color: isWinner ? "var(--secondary)" : "var(--muted)" }}>
                    {s.totalPoints}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>puntos</div>
                </div>
                {isWinner && <Check className="w-5 h-5 flex-shrink-0" style={{ color: "var(--secondary)" }} />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Acción */}
      <Link
        href={`/torneo/${tournamentId}`}
        className="w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--primary)" }}
      >
        Ver cuadro del torneo →
      </Link>
    </motion.div>
  );
}
