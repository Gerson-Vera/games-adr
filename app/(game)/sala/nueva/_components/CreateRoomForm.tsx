"use client";

import { useActionState } from "react";
import { createRoom } from "@/app/actions/room";
import type { ActionState } from "@/app/actions/auth";
import { ArrowRight } from "lucide-react";

const SIZES = [
  { value: 2, label: "2 jugadores", desc: "Final directa" },
  { value: 4, label: "4 jugadores", desc: "Semifinal → Final" },
  { value: 8, label: "8 jugadores", desc: "Cuartos → SF → Final" },
  { value: 16, label: "16 jugadores", desc: "Octavos → ... → Final" },
  { value: 32, label: "32 jugadores", desc: "32avos → ... → Final" },
];

export function CreateRoomForm() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    createRoom,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          Nombre de la sala
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Torneo Empresa Q1 2025"
          required
          disabled={isPending}
          className="w-full rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none transition disabled:opacity-50 text-sm"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-raised)" }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          Capacidad del torneo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map(({ value, label, desc }) => (
            <label
              key={value}
              className="flex items-start gap-3 rounded-xl p-3 cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-raised)" }}
            >
              <input
                type="radio"
                name="maxPlayers"
                value={value}
                defaultChecked={value === 8}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl py-3.5 text-white font-black text-sm transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "var(--primary)" }}
      >
        {isPending ? "Creando sala..." : <><span>Crear sala</span><ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}
