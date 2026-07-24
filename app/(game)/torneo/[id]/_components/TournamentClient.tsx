"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/app/lib/socket-client";
import { BracketView } from "./BracketView";
import { SpectatorDashboard } from "./SpectatorDashboard";
import { Trophy, Zap, ArrowRight } from "lucide-react";

type MatchPlayer = {
  player: { id: string; displayName: string };
};

type Score = {
  playerId: string;
  totalPoints: number;
  player: { displayName: string };
};

type Match = {
  id: string;
  status: string;
  winnerId: string | null;
  players: MatchPlayer[];
  scores: Score[];
};

type Round = {
  id: string;
  number: number;
  name: string;
  status: string;
  matches: Match[];
};

type Tournament = {
  id: string;
  status: string;
  winnerId: string | null;
  room: { name: string; code: string };
  rounds: Round[];
};

export function TournamentClient({
  tournament: initial,
  currentPlayerId,
  activeMatchId: initialActiveMatchId,
  isSpectatorAdmin,
}: {
  tournament: Tournament;
  currentPlayerId: string | null;
  activeMatchId: string | null;
  isSpectatorAdmin: boolean;
}) {
  const router = useRouter();
  const [tournament, setTournament] = useState(initial);
  const [activeMatchId, setActiveMatchId] = useState(initialActiveMatchId);
  const [champion, setChampion] = useState<{ playerId: string; displayName: string } | null>(null);

  // Admin espectador: render diferente
  if (isSpectatorAdmin) {
    return <SpectatorDashboard tournamentId={initial.id} tournamentName={initial.room.name} />;
  }

  useEffect(() => {
    const socket = getSocket();
    socket.emit("match:join", { roomCode: `tournament:${tournament.id}` });

    socket.on("tournament:updated", ({ bracket }: { bracket: Round[] }) => {
      setTournament((prev) => ({ ...prev, rounds: bracket }));

      // Detectar nuevo match activo del jugador
      const newActive = bracket
        .flatMap((r) => r.matches)
        .find(
          (m) =>
            (m.status === "VOTING" || m.status === "IN_PROGRESS") &&
            m.players.some((p) => p.player.id === currentPlayerId)
        );
      if (newActive) setActiveMatchId(newActive.id);
    });

    socket.on(
      "tournament:champion",
      (data: { playerId: string; displayName: string }) => {
        setChampion(data);
        setTournament((prev) => ({
          ...prev,
          status: "FINISHED",
          winnerId: data.playerId,
        }));
      }
    );

    return () => {
      socket.off("tournament:updated");
      socket.off("tournament:champion");
    };
  }, [tournament.id, currentPlayerId]);

  const roundLabels: Record<string, string> = {
    ROUND_OF_32: "Ronda de 32",
    ROUND_OF_16: "Octavos de final",
    QUARTERFINALS: "Cuartos de final",
    SEMIFINALS: "Semifinal",
    FINAL: "Gran Final",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Torneo</p>
          <h1 className="text-2xl font-black text-white">{tournament.room.name}</h1>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
          style={
            tournament.status === "FINISHED"
              ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
              : { background: "rgba(59,130,246,0.12)", color: "var(--primary)" }
          }
        >
          {tournament.status === "FINISHED" ? "Finalizado" : "En curso"}
        </span>
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
            <div className="mb-2"><Trophy className="w-14 h-14 mx-auto" style={{ color: "var(--secondary)" }} /></div>
            <h2 className="text-xl font-black" style={{ color: "var(--secondary)" }}>¡Campeón del Torneo!</h2>
            <p className="text-2xl font-black text-white mt-1">{champion.displayName}</p>
            {champion.playerId === currentPlayerId && (
              <p className="text-sm mt-2 font-medium" style={{ color: "rgba(245,158,11,0.7)" }}>¡Felicitaciones, eres el campeón!</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA match activo */}
      {activeMatchId && tournament.status === "IN_PROGRESS" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 flex items-center justify-between gap-3"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}
        >
          <div>
            <p className="font-black text-white">¡Tu turno!</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Tienes un enfrentamiento esperando</p>
          </div>
          <Link
            href={`/match/${activeMatchId}`}
            className="rounded-xl text-white font-bold px-4 py-2.5 text-sm flex-shrink-0 inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            <Zap className="w-4 h-4" /> Jugar <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* Cuadro del torneo */}
      <div>
        <h2 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ color: "var(--muted)" }}>Cuadro del torneo</h2>
        <BracketView
          rounds={tournament.rounds}
          currentPlayerId={currentPlayerId}
          roundLabels={roundLabels}
        />
      </div>
    </div>
  );
}
