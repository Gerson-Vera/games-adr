"use client";

import { useActionState } from "react";
import { joinRoom } from "@/app/actions/room";
import type { ActionState } from "@/app/actions/auth";

export function JoinRoomForm() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    joinRoom,
    null
  );

  return (
    <form action={action} className="flex gap-2">
      <input
        name="code"
        type="text"
        placeholder="Código de sala (ej: AB12CD)"
        maxLength={6}
        className="flex-1 rounded-xl px-4 py-3 text-white text-sm font-mono tracking-widest focus:outline-none transition"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--bg-raised)",
          textTransform: "uppercase",
        }}
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50 whitespace-nowrap"
        style={{ background: "var(--primary)" }}
      >
        {isPending ? "..." : "Entrar"}
      </button>
    </form>
  );
}
