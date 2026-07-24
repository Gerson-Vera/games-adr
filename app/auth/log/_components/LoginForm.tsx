"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function InputField({
  label,
  id,
  name,
  type = "text",
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
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
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      />
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
      {message}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos");
        setIsPending(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.");
      setIsPending(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 mb-1">
          <h2 className="text-xl font-bold text-white">Iniciar sesión</h2>
          <p className="text-zinc-500 text-sm">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        <InputField
          label="Correo electrónico"
          id="email"
          name="email"
          type="email"
          placeholder="tú@empresa.com"
          autoComplete="email"
          disabled={isPending}
        />

        <InputField
          label="Contraseña"
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isPending}
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              Ingresando...
            </>
          ) : (
            "Ingresar"
          )}
        </button>
      </form>

      <p className="text-center text-zinc-600 text-sm mt-4">
        ¿Sin cuenta?{" "}
        <Link
          href="/auth/register"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
