import { create } from "zustand";

type Option = {
  id: string;
  text: string;
  order: number;
};

type Question = {
  id: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  options: Option[];
};

type PlayerScore = {
  playerId: string;
  displayName: string;
  totalPoints: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTime: number;
};

type MatchPhase =
  | "voting"
  | "waiting"
  | "question"
  | "result"
  | "tiebreak"
  | "finished";

type GameState = {
  matchId: string | null;
  phase: MatchPhase;
  categoryId: string | null;
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  scores: PlayerScore[];
  myVote: string | null;
  myAnswer: string | null;
  wildcardUsed: boolean;
  winner: { playerId: string; displayName: string } | null;

  setMatchId: (id: string) => void;
  setPhase: (phase: MatchPhase) => void;
  setCategoryVoted: (categoryId: string) => void;
  setQuestion: (q: Question, index: number, total: number) => void;
  setTimeLeft: (t: number) => void;
  setScores: (scores: PlayerScore[]) => void;
  setMyAnswer: (optionId: string) => void;
  useWildcard: () => void;
  setWinner: (w: { playerId: string; displayName: string }) => void;
  reset: () => void;
};

const initial = {
  matchId: null,
  phase: "waiting" as MatchPhase,
  categoryId: null,
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 10,
  timeLeft: 0,
  scores: [],
  myVote: null,
  myAnswer: null,
  wildcardUsed: false,
  winner: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initial,

  setMatchId: (id) => set({ matchId: id }),
  setPhase: (phase) => set({ phase }),
  setCategoryVoted: (categoryId) => set({ myVote: categoryId }),
  setQuestion: (q, index, total) =>
    set({ currentQuestion: q, questionIndex: index, totalQuestions: total, myAnswer: null }),
  setTimeLeft: (t) => set({ timeLeft: t }),
  setScores: (scores) => set({ scores }),
  setMyAnswer: (optionId) => set({ myAnswer: optionId }),
  useWildcard: () => set({ wildcardUsed: true }),
  setWinner: (w) => set({ winner: w }),
  reset: () => set(initial),
}));
