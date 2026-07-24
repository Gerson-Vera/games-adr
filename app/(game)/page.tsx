import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/app/lib/auth/auth";
import prisma from "@/app/lib/prisma";
import { JoinRoomForm } from "@/app/components/JoinRoomForm";
import { Trophy, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [rooms, rankingData] = await Promise.all([
    prisma.room.findMany({
      where: { status: "WAITING" },
      include: {
        admin: { select: { displayName: true } },
        tournament: { select: { _count: { select: { players: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.ranking.findMany({
      orderBy: { totalPoints: "desc" },
      take: 5,
      include: { player: { select: { displayName: true, user: { select: { avatar: true } } } } },
    }),
  ]);

  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "MODERATOR";

  const firstName = session?.user?.name?.split(" ")[0] ?? "jugador";

  return (
    <div className="flex flex-col gap-6">
      {/* Header bienvenida */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>
              Bienvenido
            </p>
            <h1 className="text-2xl font-black text-white">{firstName}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Únete a una sala o espera a que te inviten
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

      {/* Salas disponibles */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Salas abiertas</p>
          <Link href="/sala" className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--primary)" }}>
            Ver todas →
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
          >
            <p className="text-sm" style={{ color: "var(--muted)" }}>No hay salas disponibles</p>
            {isAdmin && (
              <Link href="/sala/nueva" className="inline-block mt-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>
                Crea la primera sala →
              </Link>
            )}
          </div>
        ) : (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/sala/${room.code}`}
              className="flex items-center justify-between rounded-xl px-4 py-4 transition-all active:scale-[0.99]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white">{room.name}</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
                  >
                    Abierta
                  </span>
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Admin: {room.admin.displayName} · <span className="font-mono">{room.code}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-black text-white">
                  {room.tournament?._count.players ?? 0}/{room.maxPlayers}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>jugadores</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Top jugadores */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Top Jugadores</p>
          <Link href="/ranking" className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--primary)" }}>
            Ver ranking →
          </Link>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}
        >
          {rankingData.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>Sin datos aún</div>
          ) : (
            rankingData.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < rankingData.length - 1 ? "1px solid var(--bg-raised)" : undefined }}
              >
                <span
                  className="w-6 text-sm font-black text-center flex-shrink-0"
                  style={{
                    color: i === 0 ? "#F59E0B" : i === 1 ? "#CBD5E1" : i === 2 ? "#D97706" : "var(--muted)",
                  }}
                >
                  {i + 1}
                </span>
                {r.player.user.avatar ? (
                  <img src={r.player.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.2)", color: "var(--primary)" }}
                  >
                    {r.player.displayName[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{r.player.displayName}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {r.matchesWon}V / {r.matchesPlayed}J
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Trophy className="w-3.5 h-3.5" style={{ color: "var(--secondary)" }} />
                  <span className="text-sm font-black" style={{ color: "var(--secondary)" }}>
                    {r.totalPoints.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
