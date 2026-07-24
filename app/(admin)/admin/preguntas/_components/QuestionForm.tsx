"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/app/actions/auth";
import { ArrowLeft } from "lucide-react";

type Category = { id: string; name: string; icon: string | null };
type Option = { text: string; isCorrect: boolean; order: number };
type InitialData = {
  text: string;
  categoryId: string;
  difficulty: string;
  timeLimit: number;
  basePoints: number;
  imageUrl: string | null;
  options: Option[];
};

export function QuestionForm({
  action,
  categories,
  initialData,
  title,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  categories: Category[];
  initialData?: InitialData;
  title: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {
    success: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.push("/admin/preguntas");
  }, [state?.success]);

  const defaults = initialData ?? {
    text: "",
    categoryId: "",
    difficulty: "MEDIUM",
    timeLimit: 20,
    basePoints: 100,
    imageUrl: "",
    options: Array.from({ length: 5 }, (_, i) => ({
      text: "",
      isCorrect: i === 0,
      order: i,
    })),
  };

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
        </div>
        <Link
          href="/admin/preguntas"
          className="text-sm text-zinc-500 hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Texto */}
      <Field label="Pregunta">
        <textarea
          name="text"
          defaultValue={defaults.text}
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none text-sm resize-none"
          placeholder="Escribe la pregunta aquí..."
        />
      </Field>

      {/* Categoría + Dificultad */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoría">
          <select
            name="categoryId"
            defaultValue={defaults.categoryId}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none text-sm"
          >
            <option value="">Seleccionar...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Dificultad">
          <select
            name="difficulty"
            defaultValue={defaults.difficulty}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none text-sm"
          >
            <option value="EASY">Fácil</option>
            <option value="MEDIUM">Media</option>
            <option value="HARD">Difícil</option>
          </select>
        </Field>
      </div>

      {/* Tiempo + Puntos */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tiempo límite (segundos)">
          <input
            type="number"
            name="timeLimit"
            defaultValue={defaults.timeLimit}
            min={10}
            max={60}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none text-sm"
          />
        </Field>
        <Field label="Puntos base">
          <input
            type="number"
            name="basePoints"
            defaultValue={defaults.basePoints}
            min={50}
            max={500}
            step={50}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none text-sm"
          />
        </Field>
      </div>

      {/* Imagen URL */}
      <Field label="URL imagen (opcional)">
        <input
          type="url"
          name="imageUrl"
          defaultValue={defaults.imageUrl ?? ""}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none text-sm"
          placeholder="https://..."
        />
      </Field>

      {/* Opciones */}
      <div className="flex flex-col gap-3">
        <label className="text-sm text-zinc-400 font-medium">
          Opciones{" "}
          <span className="text-zinc-600 font-normal">
            — selecciona la correcta
          </span>
        </label>
        {defaults.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="radio"
              name="correct"
              value={String(i)}
              defaultChecked={opt.isCorrect}
              className="accent-indigo-500"
            />
            <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-zinc-800 text-zinc-400 flex-shrink-0">
              {["A", "B", "C", "D", "E"][i]}
            </span>
            <input
              type="text"
              name={`option_${i}`}
              defaultValue={opt.text}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none text-sm"
              placeholder={`Opción ${["A", "B", "C", "D", "E"][i]}`}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/preguntas"
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {pending ? "Guardando..." : "Guardar pregunta"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
