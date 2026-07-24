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
        twoFactorCode: { label: "Código 2FA", type: "text" },
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

          const buildResult = () =>
            ({
              id: user.id,
              email: user.email,
              name: user.username,
              image: user.avatar ?? null,
              role: user.role,
              playerId: user.player?.id ?? null,
            } as any);

          // En desarrollo no se requiere 2FA
          if (process.env.NODE_ENV === "development") {
            return buildResult();
          }

          const GRACE_MS = 60 * 60 * 1000;
          const inGracePeriod =
            user.twoFactorVerifiedAt != null &&
            Date.now() - user.twoFactorVerifiedAt.getTime() < GRACE_MS;

          if (inGracePeriod) {
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorVerifiedAt: new Date() },
            });
            return buildResult();
          }

          if (!credentials?.twoFactorCode)
            throw new Error(
              "Se requiere el código de verificación de dos factores"
            );

          if (!user.twoFactorCode || !user.twoFactorCodeExpiry)
            throw new Error(
              "Código no solicitado. Inicia el proceso de login nuevamente."
            );

          if (new Date() > user.twoFactorCodeExpiry)
            throw new Error("El código ha expirado. Solicita uno nuevo.");

          if ((user.twoFactorAttempts ?? 0) >= 5)
            throw new Error(
              "Demasiados intentos fallidos. Solicita un nuevo código."
            );

          if (credentials.twoFactorCode !== user.twoFactorCode) {
            const newAttempts = (user.twoFactorAttempts ?? 0) + 1;
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorAttempts: newAttempts },
            });
            const remaining = 5 - newAttempts;
            throw new Error(
              remaining > 0
                ? `Código incorrecto. Te quedan ${remaining} intento(s).`
                : "Demasiados intentos fallidos. Solicita un nuevo código."
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorCode: null,
              twoFactorCodeExpiry: null,
              twoFactorAttempts: 0,
              twoFactorVerifiedAt: new Date(),
            },
          });

          return buildResult();
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
  events: {
    async signOut(message: any) {
      const id = message?.token?.id;
      if (id) {
        await prisma.user
          .update({
            where: { id },
            data: { twoFactorVerifiedAt: null },
          })
          .catch(() => {});
      }
    },
  },
  secret: process.env.AUTH_SECRET,
};
