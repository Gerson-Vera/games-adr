"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomStore } from "@/app/store/useRoomStore";
import { getSocket } from "@/app/lib/socket-client";
import { Zap, Check, Copy, Users, Eye, Swords } from "lucide-react";

type RoomInfo = {
  id: string;
  code: string;
  name: string;
  maxPlayers: number;
  status: string;
  adminId: string;
  adminName: string;
  adminIsSpectator: boolean;
};

type TPlayer = {
  id: string;
  playerId: string;
  isReady: boolean;
  seed: number;
  player: { id: string; displayName: string; user: { avatar: string | null } };
};

type TournamentInfo = { id: string; status: string; players: TPlayer[] } | null;

type AdminMode = "pending" | "player" | "spectator";

export function LobbyClient({
  room,
  tournament,
  currentPlayerId,
}: {
  room: RoomInfo;
  tournament: TournamentInfo;
  currentPlayerId: string | null;
}) {
  const router = useRouter();
  const { players, setPlayers, setReady, setTournamentStatus } = useRoomStore();
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = currentPlayerId === room.adminId;

  // Determinar modo inicial del admin
  const resolveInitialMode = (): AdminMode => {
    if (!isAdmin) return "player"; // no admin, siempre jugador
    if (room.adminIsSpectator) return "spectator";
    // Si el admin ya está en el listado de jugadores del torneo, ya eligió jugar
    const alreadyJoined = tournament?.players.some((p) => p.playerId === currentPlayerId);
    if (alreadyJoined) return "player";
    return "pending"; // aún no ha elegido
  };

  const [adminMode, setAdminMode] = useState<AdminMode>(resolveInitialMode);
  const [socketReady, setSocketReady] = useState(false);

  const myEntry = players.find((p) => p.playerId === currentPlayerId);
  const nonAdminPlayers = players.filter((p) => p.playerId !== room.adminId);
  const readyCount = nonAdminPlayers.filter((p) => p.isReady).length;
  const canStart = isAdmin && players.length >= 2 && readyCount === nonAdminPlayers.length;

  // Sincronizar estado inicial desde SSR
  useEffect(() => {
    if (tournament) {
      setPlayers(tournament.players);
      setTournamentStatus(tournament.status);
    } else {
      setPlayers([]);
    }
  }, [tournament]);

  // Conectar Socket.IO cuando el modo esté resuelto
  useEffect(() => {
    if (adminMode === "pending") return; // esperar elección
    setSocketReady(true);
  }, [adminMode]);

  useEffect(() => {
    if (!socketReady) return;

    const socket = getSocket();

    if (adminMode === "spectator") {
      // Admin espectador: solo se une al socket room, no como jugador
      socket.emit("room:join", { roomCode: room.code, playerId: currentPlayerId, spectatorOnly: true });
    } else {
      socket.emit("room:join", { roomCode: room.code, playerId: currentPlayerId });
    }

    socket.on("room:updated", ({ players: updated, status }: any) => {
      setPlayers(updated);
      if (status) setTournamentStatus(status);
    });

    socket.on("tournament:started", ({ tournamentId }: any) => {
      router.push(`/torneo/${tournamentId}`);
    });

    return () => {
      socket.off("room:updated");
      socket.off("tournament:started");
      socket.emit("room:leave", { roomCode: room.code, playerId: currentPlayerId });
    };
  }, [socketReady, adminMode, room.code, currentPlayerId]);

  const chooseSpectator = useCallback(() => {
    getSocket().emit("room:setSpectator", { roomCode: room.code, adminId: currentPlayerId });
    setAdminMode("spectator");
  }, [room.code, currentPlayerId]);

  const choosePlayer = useCallback(() => {
    getSocket().emit("room:setPlayer", { roomCode: room.code, adminId: currentPlayerId });
    setAdminMode("player");
  }, [room.code, currentPlayerId]);

  const handleReady = useCallback(() => {
    if (!currentPlayerId) return;
    const newReady = !myEntry?.isReady;
    getSocket().emit("room:ready", { roomCode: room.code, playerId: currentPlayerId, isReady: newReady });
    setReady(currentPlayerId, newReady);
  }, [currentPlayerId, myEntry, room.code]);

  const handleStart = useCallback(() => {
    if (!canStart) return;
    setIsStarting(true);
    getSocket().emit("tournament:start", { roomCode: room.code, adminId: currentPlayerId });
  }, [canStart, room.code, currentPlayerId]);

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── UI de elección para el admin ───────────────────────────────────────────
  if (isAdmin && adminMode === "pending") {
    return (
      <div className="flex flex-col gap-5">
        {/* Header info */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
        >
          <h1 className="text-xl font-black text-white">{room.name}</h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Código: <span className="font-mono font-bold" style={{ color: "var(--primary)" }}>{room.code}</span>
          </p>
        </div>

        {/* Elección */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
        >
          <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>
            Como administrador
          </p>
          <h2 className="text-xl font-black text-white mb-1">¿Cómo quieres participar?</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Puedes jugar con todos o quedarte como observador viendo las partidas en tiempo real.
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={choosePlayer}
              className="w-full rounded-xl p-4 text-left flex items-center gap-4 transition-all"
              style={{ background: "rgba(59,130,246,0.1)", border: "1.5px solid rgba(59,130,246,0.4)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.2)" }}
              >
                <Swords className="w-6 h-6" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <div className="font-black text-white text-base">Voy a jugar</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Participas en el torneo compitiendo contra los demás
                </div>
              </div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={chooseSpectator}
              className="w-full rounded-xl p-4 text-left flex items-center gap-4 transition-all"
              style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.3)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.15)" }}
              >
                <Eye className="w-6 h-6" style={{ color: "var(--secondary)" }} />
              </div>
              <div>
                <div className="font-black text-white text-base">Solo observar</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Ves todas las partidas en vivo, puntos y clasificación en tiempo real
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Lobby normal ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-white">{room.name}</h1>
              {adminMode === "spectator" && (
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(245,158,11,0.12)", color: "var(--secondary)" }}
                >
                  <Eye className="w-3 h-3" /> Observando
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Admin: {room.adminName} · Máx. {room.maxPlayers} jugadores
            </p>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all active:scale-95 flex-shrink-0"
            style={{ background: "var(--bg-raised)" }}
          >
            <span className="font-mono font-black text-lg tracking-widest" style={{ color: "var(--primary)" }}>
              {room.code}
            </span>
            {copied
              ? <Check className="w-4 h-4 text-emerald-400" />
              : <Copy className="w-4 h-4" style={{ color: "var(--muted)" }} />
            }
          </button>
        </div>

        {/* Progreso */}
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--muted)" }}>
            <Users className="w-3.5 h-3.5" />
            {players.length}/{room.maxPlayers} jugadores
          </span>
          <span
            className="font-bold"
            style={{ color: nonAdminPlayers.length > 0 && readyCount === nonAdminPlayers.length ? "#10B981" : "var(--muted)" }}
          >
            {readyCount}/{nonAdminPlayers.length} listos
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--primary)" }}
            animate={{ width: `${(players.length / room.maxPlayers) * 100}%` }}
            transition={{ type: "spring", stiffness: 80 }}
          />
        </div>
      </div>

      {/* Lista de jugadores */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-widest uppercase px-1" style={{ color: "var(--muted)" }}>
          Jugadores en sala
        </p>

        <AnimatePresence>
          {players.map((tp) => (
            <motion.div
              key={tp.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
            >
              <div className="flex items-center gap-3">
                {tp.player.user.avatar ? (
                  <img src={tp.player.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.2)", color: "var(--primary)" }}
                  >
                    {tp.player.displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{tp.player.displayName}</span>
                    {tp.playerId === room.adminId && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "var(--secondary)" }}>
                        Admin
                      </span>
                    )}
                    {tp.playerId === currentPlayerId && (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>(tú)</span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                style={
                  tp.isReady
                    ? { background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }
                    : { background: "var(--bg-raised)", color: "var(--muted)" }
                }
              >
                {tp.isReady ? <><Check className="w-3 h-3" /> Listo</> : "Esperando"}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Slots vacíos */}
        {Array.from({ length: Math.max(0, room.maxPlayers - players.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ border: "1.5px dashed var(--bg-raised)" }}
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ border: "1.5px dashed var(--bg-raised)" }} />
            <span className="text-sm" style={{ color: "var(--muted)" }}>Esperando jugador...</span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2">
        {/* Botón cambiar modo para admin espectador */}
        {isAdmin && adminMode === "spectator" && (
          <button
            onClick={choosePlayer}
            className="w-full rounded-xl py-3 text-sm font-bold transition-all"
            style={{ background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--bg-raised)" }}
          >
            Cambiar a modo jugador
          </button>
        )}

        {currentPlayerId && myEntry && !isAdmin && (
          <motion.button
            onClick={handleReady}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl font-bold py-3.5 text-sm transition-all"
            style={
              myEntry.isReady
                ? { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--bg-raised)" }
                : { background: "var(--primary)", color: "white" }
            }
          >
            {myEntry.isReady ? "Cancelar" : "¡Estoy listo!"}
          </motion.button>
        )}

        {isAdmin && (
          <motion.button
            onClick={handleStart}
            disabled={!canStart || isStarting}
            whileTap={canStart ? { scale: 0.97 } : {}}
            className="w-full rounded-xl font-black py-3.5 text-sm transition-all flex items-center justify-center gap-2"
            style={
              canStart
                ? { background: "var(--primary)", color: "white", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }
                : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--bg-raised)" }
            }
          >
            {isStarting ? "Iniciando..." : canStart
              ? <><Zap className="w-4 h-4" /> Iniciar torneo</>
              : `Esperando (${readyCount}/${nonAdminPlayers.length} listos)`
            }
          </motion.button>
        )}
      </div>

      {!canStart && isAdmin && nonAdminPlayers.length > 0 && (
        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Todos los jugadores deben estar listos para iniciar
        </p>
      )}
    </div>
  );
}
