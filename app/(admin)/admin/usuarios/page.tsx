import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/app/lib/auth/auth";
import { toggleUserActive } from "@/app/actions/admin";
import { RoleForm } from "./_components/RoleForm";

export const metadata: Metadata = { title: "Admin — Usuarios" };

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "text-red-400",
  MODERATOR: "text-amber-400",
  PLAYER: "text-zinc-400",
};

export default async function UsersAdminPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/admin");

  const currentUserId = session!.user!.id!;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      player: { select: { displayName: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-white">Usuarios</h1>
        <p className="text-zinc-500 text-sm mt-1">{users.length} usuarios</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-[1fr_8rem_7rem_7rem_5rem] gap-2 px-5 py-3 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-600 uppercase tracking-wider">
          <div>Usuario</div>
          <div>Rol</div>
          <div className="text-center">Estado</div>
          <div className="text-center">Cambiar rol</div>
          <div className="text-right">Acción</div>
        </div>

        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_8rem_7rem_7rem_5rem] gap-2 px-5 py-3.5 border-b border-zinc-800/50 last:border-0 items-center"
            >
              {/* Info */}
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {u.player?.displayName ?? u.username}
                  {isSelf && (
                    <span className="text-zinc-600 text-xs ml-1">(tú)</span>
                  )}
                </p>
                <p className="text-xs text-zinc-600 truncate">@{u.username}</p>
              </div>

              {/* Rol actual */}
              <p
                className={`text-xs font-semibold ${ROLE_COLOR[u.role] ?? "text-zinc-400"}`}
              >
                {u.role}
              </p>

              {/* Estado */}
              <div className="flex justify-center">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    u.isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {u.isActive ? "Activo" : "Bloqueado"}
                </span>
              </div>

              {/* Cambiar rol */}
              {!isSelf ? (
                <RoleForm userId={u.id} currentRole={u.role} />
              ) : (
                <div />
              )}

              {/* Toggle active */}
              {!isSelf ? (
                <form
                  action={async () => {
                    "use server";
                    await toggleUserActive(u.id, !u.isActive);
                  }}
                  className="flex justify-end"
                >
                  <button
                    type="submit"
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      u.isActive
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    {u.isActive ? "Bloquear" : "Activar"}
                  </button>
                </form>
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
