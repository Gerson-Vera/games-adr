import type { Metadata } from "next";
import type { ReactNode } from "react";
import prisma from "@/app/lib/prisma";
import { Users, HelpCircle, FolderOpen, Trophy, Swords } from "lucide-react";

export const metadata: Metadata = { title: "Admin — Dashboard" };

export default async function AdminDashboard() {
  const [
    totalUsers,
    totalQuestions,
    totalCategories,
    totalTournaments,
    totalMatches,
    activeQuestions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.question.count(),
    prisma.category.count({ where: { isActive: true } }),
    prisma.tournament.count(),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.question.count({ where: { isActive: true } }),
  ]);

  const recentTournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      room: { select: { name: true, code: true } },
      _count: { select: { players: true } },
    },
  });

  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En curso",
    FINISHED: "Finalizado",
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "text-zinc-500",
    IN_PROGRESS: "text-emerald-400",
    FINISHED: "text-indigo-400",
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Resumen general de la plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Usuarios" value={totalUsers} icon={<Users className="w-6 h-6" />} />
        <StatCard
          label="Preguntas activas"
          value={`${activeQuestions}/${totalQuestions}`}
          icon={<HelpCircle className="w-6 h-6" />}
        />
        <StatCard
          label="Categorías activas"
          value={totalCategories}
          icon={<FolderOpen className="w-6 h-6" />}
        />
        <StatCard label="Torneos" value={totalTournaments} icon={<Trophy className="w-6 h-6" />} />
        <StatCard label="Partidas jugadas" value={totalMatches} icon={<Swords className="w-6 h-6" />} />
      </div>

      {/* Recent tournaments */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300">
            Torneos recientes
          </h2>
        </div>
        {recentTournaments.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">
            Sin torneos aún
          </div>
        ) : (
          recentTournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-800/50 last:border-0"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {t.room.name}
                </p>
                <p className="text-xs text-zinc-600">
                  Código: {t.room.code} · {t._count.players} jugadores
                </p>
              </div>
              <span
                className={`text-xs font-medium ${STATUS_COLOR[t.status] ?? "text-zinc-500"}`}
              >
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-4">
      <span className="text-zinc-400">{icon}</span>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-zinc-600 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
