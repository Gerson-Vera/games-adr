import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import prisma from "@/app/lib/prisma";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password)
            throw new Error("Faltan datos");

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { player: true },
          });

          if (!user || !user.isActive)
            throw new Error("Usuario no encontrado o inactivo");

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!isValid) throw new Error("Contraseña incorrecta");

          return {
            id: user.id,
            email: user.email,
            name: user.username,
            image: user.avatar ?? null,
            role: user.role,
            playerId: user.player?.id ?? null,
          } as any;
        } catch (error) {
          console.error("[authorize]", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/log",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.name = (user as any).name;
        token.picture = (user as any).image;
        token.role = (user as any).role;
        token.playerId = (user as any).playerId;
        token.username = (user as any).name; // name = username in authorize()
      }

      if (trigger === "update" && session) {
        token.name = session.name;
        token.picture = session.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        (session.user as any).role = token.role;
        (session.user as any).playerId = (token as any).playerId ?? null;
        (session.user as any).username = (token as any).username ?? token.name;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
