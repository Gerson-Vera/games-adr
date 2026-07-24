import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/lib/auth/auth";
import { CreateRoomForm } from "./_components/CreateRoomForm";

export const metadata: Metadata = { title: "Crear sala" };

export default async function NuevaSalaPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "ADMIN" && role !== "MODERATOR") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-white">Crear sala</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Configura el torneo y comparte el código con los jugadores
        </p>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-raised)" }}>
        <CreateRoomForm />
      </div>
    </div>
  );
}
