"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionState<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
} | null;

// ─── Registro ────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    displayName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    username: z
      .string()
      .min(3, "El usuario debe tener al menos 3 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterState = ActionState & { field?: string } | null;

export async function registerUser(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      error: issue.message,
      field: issue.path[0] as string,
    };
  }

  const { displayName, username, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });

    if (existing?.email === email) {
      return { success: false, error: "Este email ya está registrado", field: "email" };
    }
    if (existing?.username === username) {
      return { success: false, error: "Este nombre de usuario ya existe", field: "username" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        player: {
          create: { displayName },
        },
      },
    });
  } catch (error) {
    console.error("[registerUser]", error);
    return { success: false, error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  redirect("/auth/log?registered=true");
}
