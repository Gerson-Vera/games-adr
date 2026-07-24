"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { requestTwoFactor, type Step1State } from "@/app/actions/auth";
import { Loader2, ArrowLeft } from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const SLIDE = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const TRANSITION = { duration: 0.25, ease: "easeOut" as const };

// ─── Sub-componentes ─────────────────────────────────────────────────────────

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

function SubmitButton({
  pending,
  label,
  loadingLabel,
}: {
  pending: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin h-4 w-4" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm"
    >
      {message}
    </motion.div>
  );
}

// ─── Paso 1: Credenciales ────────────────────────────────────────────────────

function CredentialsStep({
  state,
  isPending,
  onSubmit,
}: {
  state: Step1State;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 mb-1">
        <h2 className="text-xl font-bold text-white">Iniciar sesión</h2>
        <p className="text-zinc-500 text-sm">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {state?.error && <ErrorAlert message={state.error} />}

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

      <SubmitButton
        pending={isPending}
        label="Continuar →"
        loadingLabel="Verificando..."
      />
    </form>
  );
}

// ─── Paso 2: Código 2FA ───────────────────────────────────────────────────────

function TwoFactorStep({
  email,
  error,
  isPending,
  countdown,
  onSubmit,
  onBack,
  onResend,
}: {
  email: string;
  error: string;
  isPending: boolean;
  countdown: number;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onResend: () => void;
}) {
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 mb-1">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 text-sm mb-1 flex items-center gap-1 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h2 className="text-xl font-bold text-white">
          Verificación en dos pasos
        </h2>
        <p className="text-zinc-500 text-sm">
          Enviamos un código de 6 dígitos a{" "}
          <span className="text-zinc-300 font-medium">{maskedEmail}</span>
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm font-medium text-zinc-400">
          Código de verificación
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
          required
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-4 text-white text-center text-2xl font-bold tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
        />
      </div>

      <SubmitButton
        pending={isPending}
        label="Verificar e ingresar"
        loadingLabel="Ingresando..."
      />

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-zinc-600 text-sm">
            Reenviar código en{" "}
            <span className="text-zinc-400 font-medium tabular-nums">
              {countdown}s
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            ¿No recibiste el código? Reenviar
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter();

  const credentialsRef = useRef({ email: "", password: "" });
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [direction, setDirection] = useState(1);
  const [signInError, setSignInError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [state, formAction, isPending] = useActionState<Step1State, FormData>(
    requestTwoFactor,
    null
  );

  // Reaccionar al resultado del Server Action
  useEffect(() => {
    if (!state?.success) return;

    if (!state.requiresTwoFactor) {
      performSignIn(""); // En período de gracia
    } else {
      setDirection(1);
      setStep("twoFactor");
      setCountdown(60);
    }
  }, [state]);

  // Countdown para reenvío
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const performSignIn = async (code: string) => {
    setIsSigningIn(true);
    setSignInError("");

    try {
      const result = await signIn("credentials", {
        email: credentialsRef.current.email,
        password: credentialsRef.current.password,
        twoFactorCode: code,
        redirect: false,
      });

      if (result?.error) {
        const msg =
          result.error === "CredentialsSignin"
            ? "Código incorrecto"
            : result.error;
        setSignInError(msg);
        setIsSigningIn(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setSignInError("Error al iniciar sesión. Intenta de nuevo.");
      setIsSigningIn(false);
    }
  };

  // Interceptar submit del Paso 1 para guardar las credenciales localmente
  const handleStep1Action = (formData: FormData) => {
    credentialsRef.current = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    return formAction(formData);
  };

  // Submit del Paso 2
  const handleStep2Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = String(formData.get("code") ?? "").trim();
    performSignIn(code);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep("credentials");
    setSignInError("");
  };

  const handleResend = () => {
    handleBack();
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(["credentials", "twoFactor"] as const).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              step === s ? "bg-indigo-500 scale-125" : "bg-zinc-700"
            }`}
          />
          {i === 0 && (
            <div
              className={`h-px w-8 transition-colors duration-500 ${
                step === "twoFactor" ? "bg-indigo-500" : "bg-zinc-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {stepIndicator}

      <AnimatePresence mode="wait" custom={direction}>
        {step === "credentials" ? (
          <motion.div
            key="credentials"
            custom={direction}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TRANSITION}
          >
            <CredentialsStep
              state={state}
              isPending={isPending}
              onSubmit={handleStep1Action}
            />
          </motion.div>
        ) : (
          <motion.div
            key="twoFactor"
            custom={direction}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TRANSITION}
          >
            <TwoFactorStep
              email={credentialsRef.current.email}
              error={signInError}
              isPending={isSigningIn}
              countdown={countdown}
              onSubmit={handleStep2Submit}
              onBack={handleBack}
              onResend={handleResend}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {step === "credentials" && (
        <p className="text-center text-zinc-600 text-sm mt-4">
          ¿Sin cuenta?{" "}
          <Link
            href="/auth/register"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Crear cuenta
          </Link>
        </p>
      )}
    </>
  );
}
