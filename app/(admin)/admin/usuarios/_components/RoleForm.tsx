"use client";

import { useTransition } from "react";
import { changeUserRole } from "@/app/actions/admin";

type Role = "ADMIN" | "MODERATOR" | "PLAYER";

export function RoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-center">
      <select
        disabled={pending}
        defaultValue={currentRole}
        onChange={(e) => {
          const role = e.target.value as Role;
          startTransition(() => changeUserRole(userId, role));
        }}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        <option value="PLAYER">PLAYER</option>
        <option value="MODERATOR">MODERATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </div>
  );
}
