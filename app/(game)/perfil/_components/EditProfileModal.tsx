"use client";

import { useActionState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "@/app/actions/profile";
import type { ActionState } from "@/app/actions/auth";
import { X } from "lucide-react";

const INIT: ActionState = { success: false };

export function EditProfileModal({
  open,
  onClose,
  currentDisplayName,
  currentAvatar,
}: {
  open: boolean;
  onClose: () => void;
  currentDisplayName: string;
  currentAvatar: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, INIT);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      onClose();
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Editar perfil</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 transition-all" style={{ color: "var(--muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form ref={formRef} action={action} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
                  Nombre para mostrar
                </label>
                <input
                  name="displayName"
                  defaultValue={currentDisplayName}
                  maxLength={40}
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none text-sm"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-raised)" }}
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
                  URL del avatar <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  name="avatar"
                  type="url"
                  defaultValue={currentAvatar ?? ""}
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none text-sm"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-raised)" }}
                  placeholder="https://..."
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-400 rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {state.error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl py-3 text-sm font-bold transition-all"
                  style={{ background: "var(--bg-raised)", color: "var(--muted)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-xl py-3 text-sm font-black text-white transition-opacity disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  {pending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
