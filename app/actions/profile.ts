"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/app/lib/auth/auth";
import type { ActionState } from "./auth";

const updateSchema = z.object({
  displayName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(40, "Máximo 40 caracteres"),
  avatar: z.string().url("URL inválida").or(z.literal("")).optional(),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "No autenticado" };

  const parsed = updateSchema.safeParse({
    displayName: formData.get("displayName"),
    avatar: formData.get("avatar") || "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { displayName, avatar } = parsed.data;

  try {
    await prisma.$transaction([
      prisma.player.updateMany({
        where: { userId: session.user.id },
        data: { displayName },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { avatar: avatar || null },
      }),
    ]);

    revalidatePath("/perfil");
    revalidatePath(`/perfil/${(session.user as any).username}`);
    return { success: true };
  } catch (error) {
    console.error("[updateProfile]", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}
