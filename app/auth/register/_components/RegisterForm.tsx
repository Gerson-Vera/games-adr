"use client";

import Link from "next/link";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { registerUser, type RegisterState } from "@/app/actions/auth";

function Field({
  label,
  id,
  name,
  type = "text",
  placeholder,
  autoComplete,
  disabled,
  hasError,
}: {
  label: string;
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-400">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required
        className={`w-full rounded-lg bg-zinc-800 border px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 text-sm ${
          hasError ? "border-red-500/60" : "border-zinc-700"
        }`}
      />
    </div>
  );
}

export function RegisterForm() {
  const [state, action, isPending] = useActionState<RegisterState, FormData>(
    registerUser,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 mb-1">
        <h2 className="text-xl font-bold text-white">Crear cuenta</h2>
        <p className="text-zinc-500 text-sm">
          Únete al torneo de conocimientos
        </p>
      </div>

      {state && !state.success && state.error && !state.field && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm"
        >
          {state.error}
        </motion.div>
      )}

      <Field
        label="Nombre de jugador"
        id="displayName"
        name="displayName"
        placeholder="El que verán los demás"
        disabled={isPending}
        hasError={state?.field === "displayName"}
      />
      {state?.field === "displayName" && (
        <p className="text-red-400 text-xs -mt-3">{state.error}</p>
      )}

      <Field
        label="Nombre de usuario"
        id="username"
        name="username"
        placeholder="solo_letras_y_numeros"
        autoComplete="username"
        disabled={isPending}
        hasError={state?.field === "username"}
      />
      {state?.field === "username" && (
        <p className="text-red-400 text-xs -mt-3">{state.error}</p>
      )}

      <Field
        label="Correo electrónico"
        id="email"
        name="email"
        type="email"
        placeholder="tú@empresa.com"
        autoComplete="email"
        disabled={isPending}
        hasError={state?.field === "email"}
      />
      {state?.field === "email" && (
        <p className="text-red-400 text-xs -mt-3">{state.error}</p>
      )}

      <Field
        label="Contraseña"
        id="password"
        name="password"
        type="password"
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        disabled={isPending}
        hasError={state?.field === "password"}
      />

      <Field
        label="Confirmar contraseña"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        placeholder="Repite la contraseña"
        autoComplete="new-password"
        disabled={isPending}
        hasError={state?.field === "confirmPassword"}
      />
      {state?.field === "confirmPassword" && (
        <p className="text-red-400 text-xs -mt-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-1"
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creando cuenta...
          </>
        ) : (
          "Crear cuenta →"
        )}
      </button>

      <p className="text-center text-zinc-600 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/log" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
