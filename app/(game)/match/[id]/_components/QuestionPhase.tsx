"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle } from "lucide-react";
import { useSound } from "@/app/lib/useSound";

type Option = { id: string; text: string; order: number };
type Question = {
  id: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  options: Option[];
};

const LABELS = ["A", "B", "C", "D", "E"];

export function QuestionPhase({
  question,
  questionIndex,
  totalQuestions,
  myAnswer,
  opponentAnswered,
  wildcardUsed,
  eliminatedOptions,
  onAnswer,
  onWildcard,
}: {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  myAnswer: string | null;
  opponentAnswered: boolean;
  wildcardUsed: boolean;
  eliminatedOptions: string[];
  onAnswer: (optionId: string, responseTime: number) => void;
  onWildcard: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);
  const startTimeRef = useRef(Date.now());
  const { play, stop } = useSound();
  const answeredRef = useRef(false);

  useEffect(() => {
    setTimeLeft(question.timeLimit);
    startTimeRef.current = Date.now();
    answeredRef.current = false;
  }, [question.id, question.timeLimit]);

  useEffect(() => {
    answeredRef.current = !!myAnswer;
  }, [myAnswer]);

  // Countdown + tick cada segundo
  useEffect(() => {
    if (myAnswer || timeLeft <= 0) return;
    const t = setTimeout(() => {
      if (!answeredRef.current) {
        setTimeLeft((p) => p - 1);
        play("tick");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, myAnswer]);

  // Auto-submit al agotar tiempo
  useEffect(() => {
    if (timeLeft === 0 && !myAnswer) {
      onAnswer("", question.timeLimit);
    }
  }, [timeLeft]);

  const handleSelect = (optionId: string) => {
    if (myAnswer || eliminatedOptions.includes(optionId)) return;
    stop("tick");
    play("click");
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    onAnswer(optionId, Math.min(elapsed, question.timeLimit));
  };

  const handleWildcard = () => {
    if (wildcardUsed || myAnswer) return;
    play("click");
    onWildcard();
  };

  const urgent = timeLeft <= 5;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const progress = (timeLeft / question.timeLimit) * circ;

  return (
    <div className="flex flex-col gap-4">
      {/* Pregunta */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        {/* Timer + meta */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>
              Pregunta {questionIndex + 1} / {totalQuestions}
            </p>
            {/* Estado oponente */}
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${opponentAnswered ? "bg-emerald-400" : "bg-zinc-600"}`} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {opponentAnswered ? "Oponente respondió" : "Oponente pensando..."}
              </span>
            </div>
          </div>

          {/* Timer circular */}
          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" className="absolute -rotate-90">
              <circle cx="32" cy="32" r={radius} stroke="#1E293B" strokeWidth="4" fill="none" />
              <motion.circle
                cx="32" cy="32" r={radius}
                stroke={urgent ? "#EF4444" : "#3B82F6"}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - progress}
                animate={{ strokeDashoffset: circ - progress, stroke: urgent ? "#EF4444" : "#3B82F6" }}
                transition={{ duration: 0.9, ease: "linear" }}
              />
            </svg>
            <span className={`text-lg font-black tabular-nums z-10 ${urgent ? "text-red-400" : "text-white"}`}>
              {timeLeft}
            </span>
          </div>
        </div>

        <p className="text-xl font-bold text-white leading-snug">
          {question.text}
        </p>
      </div>

      {/* Opciones */}
      <div className="flex flex-col gap-2.5">
        {question.options.map((opt) => {
          const isEliminated = eliminatedOptions.includes(opt.id);
          const isSelected = myAnswer === opt.id;
          const isDisabled = !!myAnswer || isEliminated;

          return (
            <motion.button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={isDisabled}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
              className="w-full flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all"
              style={{
                background: isSelected
                  ? "rgba(59,130,246,0.15)"
                  : isEliminated
                  ? "rgba(30,41,59,0.3)"
                  : "var(--bg-card)",
                border: `1.5px solid ${
                  isSelected
                    ? "#3B82F6"
                    : isEliminated
                    ? "transparent"
                    : "var(--bg-raised)"
                }`,
                opacity: isEliminated ? 0.3 : 1,
              }}
            >
              {/* Label */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{
                  background: isSelected ? "#3B82F6" : "var(--bg-raised)",
                  color: isSelected ? "white" : "var(--muted)",
                }}
              >
                {LABELS[opt.order]}
              </div>
              <span className={`text-base font-medium leading-snug ${isEliminated ? "line-through" : "text-white"}`}>
                {opt.text}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Fila inferior: wildcard + feedback */}
      <div className="flex items-center justify-between pt-1">
        <AnimatePresence>
          {myAnswer ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              Respuesta enviada — esperando...
            </motion.p>
          ) : timeLeft === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
              ¡Tiempo agotado!
            </motion.p>
          ) : (
            <span />
          )}
        </AnimatePresence>

        {/* Comodín */}
        <motion.button
          onClick={handleWildcard}
          disabled={wildcardUsed || !!myAnswer}
          whileTap={!wildcardUsed && !myAnswer ? { scale: 0.95 } : {}}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: wildcardUsed || myAnswer
              ? "var(--bg-card)"
              : "rgba(245,158,11,0.12)",
            border: `1.5px solid ${wildcardUsed || myAnswer ? "var(--bg-raised)" : "rgba(245,158,11,0.4)"}`,
            color: wildcardUsed || myAnswer ? "var(--muted)" : "#F59E0B",
          }}
        >
          <Shuffle className="w-4 h-4" />
          <span>{wildcardUsed ? "Usado" : "50/50"}</span>
        </motion.button>
      </div>
    </div>
  );
}
