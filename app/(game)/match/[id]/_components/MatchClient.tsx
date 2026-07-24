"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getSocket } from "@/app/lib/socket-client";
import { useGameStore } from "@/app/store/useGameStore";
import { VotingPhase } from "./VotingPhase";
import { QuestionPhase } from "./QuestionPhase";
import { ResultPhase } from "./ResultPhase";
import { Target, Swords } from "lucide-react";

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Score = { playerId: string; displayName: string; totalPoints: number };

type MatchInfo = {
  id: string;
  status: string;
  tournamentId: string;
  roundName: string;
  category: Category | null;
  scores: Score[];
  winnerId: string | null;
};

type Phase = "voting" | "category_selected" | "question" | "tiebreak" | "finished";

type Question = {
  id: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  options: { id: string; text: string; order: number }[];
};

const ROUND_LABELS: Record<string, string> = {
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos",
  QUARTERFINALS: "Cuartos",
  SEMIFINALS: "Semifinal",
  FINAL: "Final",
};

export function MatchClient({
  match: initialMatch,
  categories,
  currentPlayerId,
  opponentName,
  wildcardUsed: initialWildcardUsed,
}: {
  match: MatchInfo;
  categories: Category[];
  currentPlayerId: string;
  opponentName: string;
  wildcardUsed: boolean;
}) {
  const router = useRouter();
  const store = useGameStore();

  const [phase, setPhase] = useState<Phase>(
    initialMatch.status === "VOTING"
      ? "voting"
      : initialMatch.status === "TIEBREAK"
      ? "tiebreak"
      : initialMatch.status === "FINISHED"
      ? "finished"
      : "question"
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialMatch.category);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [scores, setScores] = useState<Score[]>(initialMatch.scores);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [wildcardUsed, setWildcardUsed] = useState(initialWildcardUsed);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [winner, setWinner] = useState<Score | null>(null);
  const [votesCast, setVotesCast] = useState<Record<string, string>>({});
  const [myVote, setMyVote] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("match:join", { matchId: initialMatch.id });

    socket.on("match:categorySelected", ({ category }: { category: Category }) => {
      setSelectedCategory(category);
      setPhase("category_selected");
      setTimeout(() => setPhase("question"), 2500);
    });

    socket.on("match:question", ({ question, index, total }: { question: Question; index: number; total: number }) => {
      setCurrentQuestion(question);
      setQuestionIndex(index);
      setTotalQuestions(total);
      setMyAnswer(null);
      setOpponentAnswered(false);
      setEliminatedOptions([]);
      setPhase("question");
    });

    socket.on("match:answerReceived", ({ playerId }: { playerId: string; questionId: string; isCorrect: boolean; points: number }) => {
      if (playerId !== currentPlayerId) setOpponentAnswered(true);
    });

    socket.on("match:wildcardUsed", ({ eliminatedOptions: ids }: { questionId: string; eliminatedOptions: string[] }) => {
      setEliminatedOptions(ids);
    });

    socket.on("match:tiebreak", () => setPhase("tiebreak"));

    socket.on("match:finished", ({ winner: w, scores: finalScores }: { winner: Score; scores: Score[] }) => {
      setScores(finalScores);
      setWinner(w);
      setPhase("finished");
    });

    socket.on("match:voteUpdate", ({ votes }: { votes: Record<string, string> }) => {
      setVotesCast(votes);
    });

    return () => {
      socket.off("match:categorySelected");
      socket.off("match:question");
      socket.off("match:answerReceived");
      socket.off("match:wildcardUsed");
      socket.off("match:tiebreak");
      socket.off("match:finished");
      socket.off("match:voteUpdate");
    };
  }, [initialMatch.id, currentPlayerId]);

  const handleVote = (categoryId: string) => {
    setMyVote(categoryId);
    getSocket().emit("match:vote", { matchId: initialMatch.id, playerId: currentPlayerId, categoryId });
  };

  const handleAnswer = (optionId: string, responseTime: number) => {
    setMyAnswer(optionId);
    getSocket().emit("match:answer", {
      matchId: initialMatch.id,
      playerId: currentPlayerId,
      questionId: currentQuestion!.id,
      optionId,
      responseTime,
      usedWildcard: false,
    });
  };

  const handleWildcard = () => {
    if (wildcardUsed || !currentQuestion) return;
    setWildcardUsed(true);
    getSocket().emit("match:wildcard", { matchId: initialMatch.id, playerId: currentPlayerId, questionId: currentQuestion.id });
  };

  const myScore = scores.find((s) => s.playerId === currentPlayerId);
  const opponentScore = scores.find((s) => s.playerId !== currentPlayerId);
  const myName = myScore?.displayName ?? "Tú";

  return (
    <div className="flex flex-col gap-4">
      {/* Scoreboard VS */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        {/* Round label */}
        <p className="text-center text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
          {ROUND_LABELS[initialMatch.roundName] ?? initialMatch.roundName}
          {phase === "question" && (
            <span className="ml-2" style={{ color: "var(--secondary)" }}>
              · RD {String(questionIndex + 1).padStart(2, "0")}/{String(totalQuestions).padStart(2, "0")}
            </span>
          )}
        </p>

        <div className="grid grid-cols-3 items-center gap-2">
          {/* YOU */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
              style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}
            >
              {myName[0]?.toUpperCase()}
            </div>
            <span
              className="text-xs font-black tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}
            >
              TÚ
            </span>
            <span className="text-3xl font-black text-white tabular-nums">
              {myScore?.totalPoints ?? 0}
            </span>
          </div>

          {/* Center VS */}
          <div className="flex flex-col items-center gap-1">
            <Swords className="w-5 h-5" style={{ color: "var(--muted)" }} />
            <span className="text-lg font-black" style={{ color: "var(--muted)" }}>VS</span>
            {selectedCategory && (
              <span className="text-lg">{selectedCategory.icon}</span>
            )}
          </div>

          {/* FOE */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
              style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}
            >
              {opponentName[0]?.toUpperCase()}
            </div>
            <span
              className="text-xs font-black tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
            >
              RIV
            </span>
            <span className="text-3xl font-black text-white tabular-nums">
              {opponentScore?.totalPoints ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Fases */}
      <AnimatePresence mode="wait">
        {phase === "voting" && (
          <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VotingPhase
              categories={categories}
              myVote={myVote}
              votesCast={votesCast}
              opponentName={opponentName}
              onVote={handleVote}
            />
          </motion.div>
        )}

        {phase === "category_selected" && selectedCategory && (
          <motion.div
            key="cat"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
          >
            <div className="text-6xl mb-3">{selectedCategory.icon}</div>
            <h2 className="text-2xl font-bold text-white">{selectedCategory.name}</h2>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>Preparando las preguntas...</p>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--primary)" }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "question" && currentQuestion && (
          <motion.div
            key={`q-${currentQuestion.id}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <QuestionPhase
              question={currentQuestion}
              questionIndex={questionIndex}
              totalQuestions={totalQuestions}
              myAnswer={myAnswer}
              opponentAnswered={opponentAnswered}
              wildcardUsed={wildcardUsed}
              eliminatedOptions={eliminatedOptions}
              onAnswer={handleAnswer}
              onWildcard={handleWildcard}
            />
          </motion.div>
        )}

        {phase === "tiebreak" && (
          <motion.div
            key="tiebreak"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--bg-card)", border: "1.5px solid rgba(245,158,11,0.3)" }}
          >
            <Target className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--secondary)" }} />
            <h2 className="text-xl font-bold" style={{ color: "var(--secondary)" }}>¡Empate!</h2>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              Una pregunta de desempate determinará al ganador
            </p>
          </motion.div>
        )}

        {phase === "finished" && (
          <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <ResultPhase
              scores={scores}
              winner={winner}
              currentPlayerId={currentPlayerId}
              tournamentId={initialMatch.tournamentId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
