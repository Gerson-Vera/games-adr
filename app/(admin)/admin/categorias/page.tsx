import type { Metadata } from "next";
import prisma from "@/app/lib/prisma";
import { toggleCategory, createCategory } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Admin — Categorías" };

async function createCategoryAction(formData: FormData) {
  "use server";
  await createCategory({ success: false }, formData);
}

export default async function CategoriesAdminPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Categorías</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {categories.length} categoría{categories.length !== 1 && "s"}
        </p>
      </div>

      {/* Nueva categoría */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">
          Nueva categoría
        </h2>
        <form action={createCategoryAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              name="name"
              required
              placeholder="Nombre *"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
            <input
              name="icon"
              placeholder="Emoji (ej: 🎨)"
              maxLength={10}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <input
            name="description"
            placeholder="Descripción (opcional)"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Crear categoría
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/50 last:border-0"
          >
            <span className="text-2xl w-8 text-center">{c.icon ?? "—"}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-zinc-600">
                {c._count.questions} pregunta{c._count.questions !== 1 && "s"}
                {c.description && ` · ${c.description}`}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await toggleCategory(c.id, !c.isActive);
              }}
            >
              <button
                type="submit"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  c.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-600"
                }`}
              >
                {c.isActive ? "Activa" : "Inactiva"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
