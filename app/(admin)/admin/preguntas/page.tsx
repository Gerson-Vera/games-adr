import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/app/lib/prisma";
import { toggleQuestion, deleteQuestion } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Admin — Preguntas" };

const DIFF_LABEL: Record<string, string> = {
  EASY: "Fácil",
  MEDIUM: "Media",
  HARD: "Difícil",
};
const DIFF_COLOR: Record<string, string> = {
  EASY: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  HARD: "text-red-400",
};

export default async function QuestionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; diff?: string; q?: string }>;
}) {
  const { cat, diff, q } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  const questions = await prisma.question.findMany({
    where: {
      ...(cat ? { categoryId: cat } : {}),
      ...(diff ? { difficulty: diff as any } : {}),
      ...(q
        ? { text: { contains: q, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, icon: true } },
      _count: { select: { options: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Preguntas</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {questions.length} pregunta{questions.length !== 1 && "s"}
          </p>
        </div>
        <Link
          href="/admin/preguntas/nueva"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 text-sm transition-colors"
        >
          + Nueva pregunta
        </Link>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar..."
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none w-48"
        />
        <select
          name="cat"
          defaultValue={cat ?? ""}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          name="diff"
          defaultValue={diff ?? ""}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todas las dificultades</option>
          <option value="EASY">Fácil</option>
          <option value="MEDIUM">Media</option>
          <option value="HARD">Difícil</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
        >
          Filtrar
        </button>
        {(cat || diff || q) && (
          <Link
            href="/admin/preguntas"
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-[1fr_8rem_6rem_6rem_5rem] gap-2 px-5 py-3 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-600 uppercase tracking-wider">
          <div>Pregunta</div>
          <div>Categoría</div>
          <div className="text-center">Dificultad</div>
          <div className="text-center">Estado</div>
          <div className="text-right">Acciones</div>
        </div>

        {questions.length === 0 ? (
          <div className="p-10 text-center text-zinc-600 text-sm">
            No hay preguntas con esos filtros
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="grid grid-cols-[1fr_8rem_6rem_6rem_5rem] gap-2 px-5 py-3.5 border-b border-zinc-800/50 last:border-0 items-center"
            >
              <p className="text-sm text-white truncate">{q.text}</p>
              <p className="text-xs text-zinc-500 truncate">
                {q.category.icon} {q.category.name}
              </p>
              <p
                className={`text-xs text-center font-medium ${DIFF_COLOR[q.difficulty]}`}
              >
                {DIFF_LABEL[q.difficulty]}
              </p>
              <div className="flex justify-center">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    q.isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-800 text-zinc-600"
                  }`}
                >
                  {q.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/preguntas/${q.id}`}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Editar
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await toggleQuestion(q.id, !q.isActive);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded px-2 py-1 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {q.isActive ? "Off" : "On"}
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
