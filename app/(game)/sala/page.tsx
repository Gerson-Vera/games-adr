import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { JoinRoomForm } from "@/app/components/JoinRoomForm";
import { Zap } from "lucide-react";

export const metadata: Metadata = { title: "Salas" };

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Esperando",
  FULL: "Llena",
  IN_PROGRESS: "En curso",
  FINISHED: "Finalizada",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  WAITING:     { bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  FULL:        { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  IN_PROGRESS: { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
  FINISHED:    { bg: "rgba(100,116,139,0.12)", color: "#64748B" },
};

export default async function SalaListPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "MODERATOR";

  const statusFilter = (
    ["WAITING", "FULL", "IN_PROGRESS", "FINISHED"].includes(estado ?? "")
      ? estado
      : undefined
  ) as any;

  const rooms = await prisma.room.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      admin: { select: { displayName: true } },
      tournament: {
        select: { id: true, status: true, _count: { select: { players: true } } },
      },
    },
  });

  const counts = await prisma.room.groupBy({ by: ["status"], _count: { id: true } });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  const total = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Salas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {rooms.length} sala{rooms.length !== 1 && "s"} encontradas
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/sala/nueva"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <Zap className="w-4 h-4" />
            Crear sala
          </Link>
        )}
      </div>

      {/* Unirse por código */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
          Unirse con código
        </p>
        <JoinRoomForm />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterTab href="/sala" active={!estado} label="Todas" count={total} />
        <FilterTab href="/sala?estado=WAITING" active={estado === "WAITING"} label="Esperando" count={countMap["WAITING"] ?? 0} color="#10B981" />
        <FilterTab href="/sala?estado=IN_PROGRESS" active={estado === "IN_PROGRESS"} label="En curso" count={countMap["IN_PROGRESS"] ?? 0} color="var(--primary)" />
        <FilterTab href="/sala?estado=FINISHED" active={estado === "FINISHED"} label="Finalizadas" count={countMap["FINISHED"] ?? 0} />
      </div>

      {/* Lista */}
      {rooms.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted)" }}>No hay salas con ese filtro</p>
          {isAdmin && (
            <Link href="/sala/nueva" className="inline-block mt-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>
              Crea la primera sala →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => {
            const playerCount = room.tournament?._count.players ?? 0;
            const isFull = playerCount >= room.maxPlayers;
            const canJoin = room.status === "WAITING" && !isFull;
            const statusStyle = STATUS_STYLE[room.status] ?? STATUS_STYLE.FINISHED;

            return (
              <Link
                key={room.id}
                href={
                  room.tournament && room.status === "IN_PROGRESS"
                    ? `/torneo/${room.tournament.id}`
                    : `/sala/${room.code}`
                }
                className="flex items-center justify-between rounded-xl px-4 py-4 transition-all active:scale-[0.99]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-raised)",
                  opacity: room.status === "FINISHED" ? 0.6 : 1,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white truncate">{room.name}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {STATUS_LABEL[room.status] ?? room.status}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    Admin: {room.admin.displayName} · <span className="font-mono">{room.code}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div
                    className="font-black text-base"
                    style={{ color: isFull ? "#EF4444" : "var(--text)" }}
                  >
                    {playerCount}/{room.maxPlayers}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {canJoin ? "Entrar →" : room.status === "IN_PROGRESS" ? "Ver →" : "jugadores"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  label,
  count,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
      style={
        active
          ? { background: "rgba(59,130,246,0.12)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.3)" }
          : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--bg-raised)" }
      }
    >
      <span style={!active && color ? { color } : undefined}>{label}</span>
      <span
        className="text-xs rounded-full px-1.5 py-0.5"
        style={
          active
            ? { background: "rgba(59,130,246,0.2)", color: "var(--primary)" }
            : { background: "var(--bg-raised)", color: "var(--muted)" }
        }
      >
        {count}
      </span>
    </Link>
  );
}
