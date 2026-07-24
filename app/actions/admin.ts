"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/app/lib/auth/auth";
import type { ActionState } from "./auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "MODERATOR")) {
    redirect("/");
  }
  return session.user as any;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || role !== "ADMIN") {
    redirect("/");
  }
  return session.user as any;
}

// ─── Questions ────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  text: z.string().min(5, "Mínimo 5 caracteres").max(500),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.coerce.number().int().min(10).max(60),
  basePoints: z.coerce.number().int().min(50).max(500),
  imageUrl: z.string().url("URL inválida").or(z.literal("")).optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1, "La opción no puede estar vacía"),
        isCorrect: z.boolean(),
      })
    )
    .length(5)
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: "Debe haber exactamente 1 opción correcta",
    }),
});

export async function createQuestion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const rawOptions = Array.from({ length: 5 }, (_, i) => ({
    text: (formData.get(`option_${i}`) as string) ?? "",
    isCorrect: formData.get(`correct`) === String(i),
  }));

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    categoryId: formData.get("categoryId"),
    difficulty: formData.get("difficulty"),
    timeLimit: formData.get("timeLimit"),
    basePoints: formData.get("basePoints"),
    imageUrl: formData.get("imageUrl") || "",
    options: rawOptions,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { options, imageUrl, ...rest } = parsed.data;

  try {
    await prisma.question.create({
      data: {
        ...rest,
        imageUrl: imageUrl || null,
        options: {
          create: options.map((o, i) => ({ ...o, order: i })),
        },
      },
    });

    revalidatePath("/admin/preguntas");
    return { success: true };
  } catch (error) {
    console.error("[createQuestion]", error);
    return { success: false, error: "Error al crear la pregunta" };
  }
}

export async function updateQuestion(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const rawOptions = Array.from({ length: 5 }, (_, i) => ({
    text: (formData.get(`option_${i}`) as string) ?? "",
    isCorrect: formData.get(`correct`) === String(i),
  }));

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    categoryId: formData.get("categoryId"),
    difficulty: formData.get("difficulty"),
    timeLimit: formData.get("timeLimit"),
    basePoints: formData.get("basePoints"),
    imageUrl: formData.get("imageUrl") || "",
    options: rawOptions,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { options, imageUrl, ...rest } = parsed.data;

  try {
    await prisma.$transaction([
      prisma.option.deleteMany({ where: { questionId: id } }),
      prisma.question.update({
        where: { id },
        data: {
          ...rest,
          imageUrl: imageUrl || null,
          options: {
            create: options.map((o, i) => ({ ...o, order: i })),
          },
        },
      }),
    ]);

    revalidatePath("/admin/preguntas");
    revalidatePath(`/admin/preguntas/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[updateQuestion]", error);
    return { success: false, error: "Error al actualizar la pregunta" };
  }
}

export async function toggleQuestion(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.question.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/preguntas");
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/preguntas");
}

// ─── Categories ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await prisma.category.create({ data: parsed.data });
    revalidatePath("/admin/categorias");
    return { success: true };
  } catch {
    return { success: false, error: "Error al crear la categoría" };
  }
}

export async function toggleCategory(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.category.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/categorias");
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function toggleUserActive(id: string, isActive: boolean) {
  await requireSuperAdmin();
  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/usuarios");
}

export async function changeUserRole(
  id: string,
  role: "ADMIN" | "MODERATOR" | "PLAYER"
) {
  await requireSuperAdmin();
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/usuarios");
}
