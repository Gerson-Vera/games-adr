import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/lib/auth/auth";

export default async function MyProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/log");
  redirect(`/perfil/${(session.user as any).username}`);
}
