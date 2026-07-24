import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/lib/auth/auth";
import { GameNav } from "@/app/components/GameNav";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/log");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <GameNav user={session.user} />
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
