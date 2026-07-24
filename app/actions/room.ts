"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/app/lib/auth/auth";
import type { ActionState } from "./auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getPlayer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");

  const player = await prisma.player.findUnique({
    where: { userId: session.user.id },
  });
  if (!player) throw new Error("Perfil de jugador no encontrado");

  return player;
}

// ─── Crear sala ───────────────────────────────────────────────────────────────

const createRoomSchema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(40, "Máximo 40 caracteres"),
  maxPlayers: z.coerce
    .number()
    .refine((v) => [2, 4, 8, 16, 32].includes(v), "Debe ser 2, 4, 8, 16 o 32 jugadores"),
});

export async function createRoom(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createRoomSchema.safeParse({
    name: formData.get("name"),
    maxPlayers: formData.get("maxPlayers"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let player;
  try {
    player = await getPlayer();
  } catch {
    return { success: false, error: "No autenticado" };
  }

  // Generar código único
  let code = generateRoomCode();
  let attempts = 0;
  while (await prisma.room.findUnique({ where: { code } })) {
    code = generateRoomCode();
    if (++attempts > 10) return { success: false, error: "Error generando código" };
  }

  try {
    await prisma.room.create({
      data: {
        code,
        name: parsed.data.name,
        maxPlayers: parsed.data.maxPlayers,
        adminId: player.id,
      },
    });
  } catch (error) {
    console.error("[createRoom]", error);
    return { success: false, error: "Error al crear la sala" };
  }

  redirect(`/sala/${code}`);
}

// ─── Unirse a sala ────────────────────────────────────────────────────────────

const joinSchema = z.object({
  code: z
    .string()
    .min(6, "El código tiene 6 caracteres")
    .max(6)
    .toUpperCase(),
});

export async function joinRoom(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = joinSchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const room = await prisma.room.findUnique({
    where: { code: parsed.data.code },
  });

  if (!room) return { success: false, error: "Sala no encontrada" };
  if (room.status !== "WAITING" && room.status !== "FULL") {
    return { success: false, error: "La sala ya no está disponible" };
  }

  redirect(`/sala/${parsed.data.code}`);
}

// ─── Salir de sala ────────────────────────────────────────────────────────────

export async function leaveRoom(roomCode: string): Promise<void> {
  revalidatePath(`/sala/${roomCode}`);
  revalidatePath("/sala");
}

// ─── Marcar listo ────────────────────────────────────────────────────────────

export async function toggleReady(
  tournamentId: string,
  playerId: string,
  isReady: boolean
): Promise<void> {
  await prisma.tournamentPlayer.updateMany({
    where: { tournamentId, playerId },
    data: { isReady },
  });
  revalidatePath("/sala/[codigo]", "page");
}
