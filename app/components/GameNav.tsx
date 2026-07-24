"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { Zap, Trophy, LayoutGrid, LogOut, ShieldCheck } from "lucide-react";

export function GameNav({ user }: { user: Session["user"] }) {
  const role = (user as any).role as string | undefined;
  const username = (user as any).username as string | undefined;
  const isAdmin = role === "ADMIN" || role === "MODERATOR";

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: "var(--bg-card)", borderColor: "var(--bg-raised)" }}
    >
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-black text-lg tracking-tight text-white">
          <Zap className="w-5 h-5" style={{ color: "var(--secondary)" }} />
          VERSUS
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-1">
          <Link
            href="/sala"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Salas</span>
          </Link>
          <Link
            href="/ranking"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ranking</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              style={{ color: "var(--secondary)" }}
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
          )}

          {/* Avatar */}
          <Link
            href={username ? `/perfil/${username}` : "/perfil"}
            className="ml-1"
          >
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--bg-raised)]"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                {(user.name ?? "?")[0].toUpperCase()}
              </div>
            )}
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/log" })}
            className="rounded-lg p-2 transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
