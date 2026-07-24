import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/app/lib/auth/auth";
import { BarChart2, HelpCircle, FolderOpen, Users, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "MODERATOR")) {
    redirect("/");
  }

  const isAdmin = role === "ADMIN";

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: <BarChart2 className="w-4 h-4" /> },
    { href: "/admin/preguntas", label: "Preguntas", icon: <HelpCircle className="w-4 h-4" /> },
    { href: "/admin/categorias", label: "Categorías", icon: <FolderOpen className="w-4 h-4" /> },
    ...(isAdmin
      ? [{ href: "/admin/usuarios", label: "Usuarios", icon: <Users className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800 flex flex-col py-6 px-3 gap-1 flex-shrink-0">
        <div className="px-3 mb-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium">
            Panel Admin
          </p>
          <p className="text-sm font-semibold text-indigo-400 mt-0.5">
            {role}
          </p>
        </div>

        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}

        <div className="mt-auto pt-4 border-t border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al juego
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
