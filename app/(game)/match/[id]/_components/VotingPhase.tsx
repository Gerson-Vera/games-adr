"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Category = { id: string; name: string; icon: string | null; color: string | null };

const VOTE_TIMEOUT = 30;

// Fallback colors per category name
const CAT_COLORS: Record<string, string> = {
  Ciencia:    "#06B6D4",
  Historia:   "#F59E0B",
  Deportes:   "#F97316",
  Arte:       "#EC4899",
  Tecnología: "#10B981",
};

export function VotingPhase({
  categories,
  myVote,
  votesCast,
  opponentName,
  onVote,
}: {
  categories: Category[];
  myVote: string | null;
  votesCast: Record<string, string>;
  opponentName: string;
  onVote: (categoryId: string) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(VOTE_TIMEOUT);
  const opponentVoted = Object.keys(votesCast).length >= 2;
  const urgent = timeLeft <= 10;

  useEffect(() => {
    if (timeLeft <= 0 || myVote) return;
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, myVote]);

  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (timeLeft / VOTE_TIMEOUT) * circ;

  return (
    <div className="flex flex-col gap-5">
      {/* Timer circular */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" className="absolute -rotate-90">
            <circle cx="40" cy="40" r={radius} stroke="#1E293B" strokeWidth="5" fill="none" />
            <motion.circle
              cx="40" cy="40" r={radius}
              stroke={urgent ? "#EF4444" : "#3B82F6"}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              animate={{ strokeDashoffset: offset, stroke: urgent ? "#EF4444" : "#3B82F6" }}
              transition={{ duration: 0.8, ease: "linear" }}
            />
          </svg>
          <span className={`text-2xl font-black tabular-nums z-10 ${urgent ? "text-red-400" : "text-white"}`}>
            {timeLeft}
          </span>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          Tiempo para votar
        </p>

        {/* Estado oponente */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          <div className={`w-1.5 h-1.5 rounded-full ${opponentVoted ? "bg-emerald-400" : "bg-zinc-600"}`} />
          {opponentVoted ? `${opponentName} ya votó` : `${opponentName} pensando...`}
        </div>
      </div>

      {/* Categorías */}
      <div className="flex flex-col gap-3">
        {categories.map((cat, i) => {
          const color = cat.color ?? CAT_COLORS[cat.name] ?? "#3B82F6";
          const isSelected = myVote === cat.id;
          const disabled = !!myVote;

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => !disabled && onVote(cat.id)}
              disabled={disabled}
              className="w-full flex items-center gap-4 rounded-xl text-left overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: isSelected ? `${color}18` : "var(--bg-card)",
                border: `1px solid ${isSelected ? color : "var(--bg-raised)"}`,
                opacity: disabled && !isSelected ? 0.45 : 1,
              }}
            >
              {/* Borde izquierdo coloreado */}
              <div className="w-1 self-stretch flex-shrink-0 rounded-l-xl" style={{ background: color }} />

              {/* Icono */}
              <span className="text-3xl py-4">{cat.icon}</span>

              {/* Nombre */}
              <div className="flex-1 py-4">
                <div className="font-black text-lg tracking-wide text-white uppercase">
                  {cat.name}
                </div>
                {isSelected && (
                  <div className="text-xs font-medium mt-0.5" style={{ color }}>
                    Tu voto
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="pr-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: color }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {myVote && (
        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Esperando al oponente...
        </p>
      )}
    </div>
  );
}
