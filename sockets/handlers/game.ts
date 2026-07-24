import type { Server, Socket } from "socket.io";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const QUESTIONS_PER_MATCH = 10;
const VOTE_TIMEOUT_MS = 30_000;
const MAX_POINTS = 1000;

// Votes in-memory: matchId → { playerId: categoryId }
const matchVotes = new Map<string, Map<string, string>>();
// Question timers: matchId → NodeJS.Timeout
const questionTimers = new Map<string, NodeJS.Timeout>();
// Spectator tracking: matchId → { index, total }
const currentQuestionState = new Map<string, { index: number; total: number }>();
// Who answered per question: matchId → questionIndex → Set<playerId>
const questionAnswers = new Map<string, Map<number, Set<string>>>();
// Cache matchId → tournamentId
const matchTournamentCache = new Map<string, string>();

export function registerGameHandlers(io: Server, socket: Socket) {
  // Unirse al room del match
  socket.on("match:join", async ({ matchId }: { matchId: string }) => {
    socket.join(`match:${matchId}`);
  });

  // Espectador se une al room del torneo
  socket.on("spectator:join", async ({ tournamentId }: { tournamentId: string }) => {
    socket.join(`spectator:${tournamentId}`);
    socket.join(`tournament:${tournamentId}`);
    // Enviar estado actual inmediatamente
    await emitSpectatorUpdate(io, tournamentId);
  });

  // Votar categoría
  socket.on(
    "match:vote",
    async ({ matchId, playerId, categoryId }: { matchId: string; playerId: string; categoryId: string }) => {
      await prisma.vote.upsert({
        where: { matchId_playerId: { matchId, playerId } },
        update: { categoryId },
        create: { matchId, playerId, categoryId },
      });

      if (!matchVotes.has(matchId)) matchVotes.set(matchId, new Map());
      matchVotes.get(matchId)!.set(playerId, categoryId);

      io.to(`match:${matchId}`).emit("match:voteUpdate", {
        votes: Object.fromEntries(matchVotes.get(matchId)!),
      });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { players: true },
      });

      const votes = matchVotes.get(matchId)!;
      if (match && votes.size >= match.players.length) {
        await resolveVotes(io, matchId, votes, match.players.map((p) => p.playerId));
      }
    }
  );

  // Responder pregunta
  socket.on(
    "match:answer",
    async ({
      matchId,
      playerId,
      questionId,
      optionId,
      responseTime,
      usedWildcard,
    }: {
      matchId: string;
      playerId: string;
      questionId: string;
      optionId: string;
      responseTime: number;
      usedWildcard?: boolean;
    }) => {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true },
      });
      if (!question) return;

      const correct = question.options.find((o) => o.id === optionId && o.isCorrect);
      const timeLimit = question.timeLimit;
      const points = correct
        ? Math.round(question.basePoints * (1 - responseTime / timeLimit) * 0.8 + question.basePoints * 0.2)
        : 0;

      await prisma.answer.create({
        data: { matchId, playerId, questionId, optionId, isCorrect: !!correct, responseTime, points, usedWildcard: !!usedWildcard },
      });

      if (usedWildcard) {
        await prisma.wildcard.upsert({
          where: { matchId_playerId: { matchId, playerId } },
          update: {},
          create: { matchId, playerId },
        });
      }

      await prisma.score.updateMany({
        where: { matchId, playerId },
        data: {
          totalPoints: { increment: points },
          correctAnswers: correct ? { increment: 1 } : undefined,
          wrongAnswers: !correct ? { increment: 1 } : undefined,
          totalTime: { increment: responseTime },
        },
      });

      io.to(`match:${matchId}`).emit("match:answerReceived", {
        playerId,
        questionId,
        isCorrect: !!correct,
        points,
      });

      // Registrar respuesta para espectadores
      const qState = currentQuestionState.get(matchId);
      if (qState) {
        if (!questionAnswers.has(matchId)) questionAnswers.set(matchId, new Map());
        const qAnswers = questionAnswers.get(matchId)!;
        if (!qAnswers.has(qState.index)) qAnswers.set(qState.index, new Set());
        qAnswers.get(qState.index)!.add(playerId);
      }

      const tournamentId = matchTournamentCache.get(matchId);
      if (tournamentId) await emitSpectatorUpdate(io, tournamentId);
    }
  );

  // Comodín
  socket.on(
    "match:wildcard",
    async ({ matchId, playerId, questionId }: { matchId: string; playerId: string; questionId: string }) => {
      const used = await prisma.wildcard.findUnique({
        where: { matchId_playerId: { matchId, playerId } },
      });
      if (used) return;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true },
      });
      if (!question) return;

      const incorrect = question.options.filter((o) => !o.isCorrect);
      const toEliminate = incorrect.sort(() => Math.random() - 0.5).slice(0, 2).map((o) => o.id);
      socket.emit("match:wildcardUsed", { questionId, eliminatedOptions: toEliminate });
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveVotes(io: Server, matchId: string, votes: Map<string, string>, playerIds: string[]) {
  const voteArray = [...votes.values()];
  const categoryId = voteArray[0] === voteArray[1]
    ? voteArray[0]
    : voteArray[Math.floor(Math.random() * voteArray.length)];

  await prisma.match.update({ where: { id: matchId }, data: { categoryId, status: "IN_PROGRESS" } });
  matchVotes.delete(matchId);

  // Cachear tournamentId para este match
  if (!matchTournamentCache.has(matchId)) {
    const matchWithRound = await prisma.match.findUnique({
      where: { id: matchId },
      include: { round: { select: { tournamentId: true } } },
    });
    if (matchWithRound?.round.tournamentId) {
      matchTournamentCache.set(matchId, matchWithRound.round.tournamentId);
    }
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  io.to(`match:${matchId}`).emit("match:categorySelected", { category });

  const questions = await prisma.question.findMany({
    where: { categoryId, isActive: true },
    include: { options: { orderBy: { order: "asc" } } },
    take: QUESTIONS_PER_MATCH * 3,
  });

  const selected = questions.sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_MATCH);
  await sendQuestions(io, matchId, selected, playerIds);
}

async function sendQuestions(io: Server, matchId: string, questions: any[], playerIds: string[]) {
  // Inicializar tracking de respuestas para este match
  questionAnswers.set(matchId, new Map());

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Actualizar estado actual para espectadores
    currentQuestionState.set(matchId, { index: i, total: questions.length });
    questionAnswers.get(matchId)!.set(i, new Set());

    io.to(`match:${matchId}`).emit("match:question", {
      question: {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        timeLimit: q.timeLimit,
        options: q.options.map((o: any) => ({ id: o.id, text: o.text, order: o.order })),
      },
      index: i,
      total: questions.length,
    });

    // Notificar a espectadores que empezó nueva pregunta
    const tournamentId = matchTournamentCache.get(matchId);
    if (tournamentId) await emitSpectatorUpdate(io, tournamentId);

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, q.timeLimit * 1000 + 500);
      questionTimers.set(`${matchId}-${i}`, timer);
    });

    if (i < questions.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  currentQuestionState.delete(matchId);
  questionAnswers.delete(matchId);
  await finishMatch(io, matchId, playerIds);
}

async function finishMatch(io: Server, matchId: string, playerIds: string[]) {
  const scores = await prisma.score.findMany({
    where: { matchId },
    orderBy: [{ totalPoints: "desc" }, { totalTime: "asc" }],
    include: { player: { select: { displayName: true } } },
  });

  const [winner, loser] = scores;
  const isTie = winner.totalPoints === loser?.totalPoints;

  if (!isTie) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "FINISHED", winnerId: winner.playerId, finishedAt: new Date() },
    });

    await updateRankings(winner.playerId, loser?.playerId);

    await prisma.matchHistory.create({
      data: {
        matchId,
        summary: {
          scores: scores.map((s) => ({
            playerId: s.playerId,
            displayName: s.player.displayName,
            totalPoints: s.totalPoints,
            correctAnswers: s.correctAnswers,
            wrongAnswers: s.wrongAnswers,
            totalTime: s.totalTime,
          })),
        },
      },
    });

    io.to(`match:${matchId}`).emit("match:finished", {
      winner: { playerId: winner.playerId, displayName: winner.player.displayName },
      scores,
    });

    // Actualizar espectadores cuando termina un match
    const tournamentId = matchTournamentCache.get(matchId);
    if (tournamentId) {
      await emitSpectatorUpdate(io, tournamentId);
      matchTournamentCache.delete(matchId);
    }

    await advanceTournament(io, matchId, winner.playerId);
  } else {
    await prisma.match.update({ where: { id: matchId }, data: { status: "TIEBREAK", isTiebreak: true } });
    io.to(`match:${matchId}`).emit("match:tiebreak");
  }
}

async function updateRankings(winnerId: string, loserId?: string) {
  await prisma.ranking.upsert({
    where: { playerId: winnerId },
    update: { matchesPlayed: { increment: 1 }, matchesWon: { increment: 1 }, winStreak: { increment: 1 } },
    create: { playerId: winnerId, matchesPlayed: 1, matchesWon: 1, winStreak: 1, maxWinStreak: 1 },
  });
  if (loserId) {
    await prisma.ranking.upsert({
      where: { playerId: loserId },
      update: { matchesPlayed: { increment: 1 }, winStreak: 0 },
      create: { playerId: loserId, matchesPlayed: 1 },
    });
  }
}

async function advanceTournament(io: Server, matchId: string, winnerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { round: { include: { tournament: true, matches: true } } },
  });
  if (!match) return;

  const round = match.round;
  const allFinished = round.matches.every((m) => m.status === "FINISHED" || m.id === matchId);
  if (!allFinished) return;

  if (round.name === "FINAL") {
    await prisma.tournament.update({
      where: { id: round.tournamentId },
      data: { status: "FINISHED", winnerId, finishedAt: new Date() },
    });

    const winner = await prisma.player.findUnique({ where: { id: winnerId }, select: { displayName: true } });

    await prisma.ranking.upsert({
      where: { playerId: winnerId },
      update: { tournamentsWon: { increment: 1 } },
      create: { playerId: winnerId, tournamentsWon: 1 },
    });

    io.to(`tournament:${round.tournamentId}`).emit("tournament:champion", {
      playerId: winnerId,
      displayName: winner?.displayName,
    });
    io.to(`spectator:${round.tournamentId}`).emit("tournament:champion", {
      playerId: winnerId,
      displayName: winner?.displayName,
    });
    return;
  }

  const finishedMatches = await prisma.match.findMany({
    where: { roundId: round.id, status: "FINISHED" },
    select: { winnerId: true },
  });
  const winners = finishedMatches.map((m) => m.winnerId!);

  const nextRoundName = getNextRoundName(round.name as any);
  const nextRound = await prisma.round.create({
    data: { tournamentId: round.tournamentId, number: round.number + 1, name: nextRoundName, status: "IN_PROGRESS" },
  });

  for (let i = 0; i < winners.length; i += 2) {
    await prisma.match.create({
      data: {
        roundId: nextRound.id,
        status: "VOTING",
        players: {
          create: [
            { playerId: winners[i], bracket: 1 },
            { playerId: winners[i + 1], bracket: 2 },
          ],
        },
        scores: {
          create: [{ playerId: winners[i] }, { playerId: winners[i + 1] }],
        },
      },
    });
  }

  await prisma.round.update({ where: { id: round.id }, data: { status: "FINISHED" } });

  const bracket = await getBracket(round.tournamentId);
  io.to(`tournament:${round.tournamentId}`).emit("tournament:updated", { bracket });
  io.to(`spectator:${round.tournamentId}`).emit("tournament:updated", { bracket });
}

function getNextRoundName(current: string): any {
  const order = ["ROUND_OF_32", "ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS", "FINAL"];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}

async function getBracket(tournamentId: string) {
  return prisma.round.findMany({
    where: { tournamentId },
    include: {
      matches: {
        include: {
          players: { include: { player: { select: { displayName: true } } } },
          scores: true,
        },
      },
    },
    orderBy: { number: "asc" },
  });
}

// ─── Spectator live update ────────────────────────────────────────────────────

async function emitSpectatorUpdate(io: Server, tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: { include: { player: { select: { id: true, displayName: true } } } },
      rounds: {
        include: {
          matches: {
            include: {
              players: { include: { player: { select: { id: true, displayName: true } } } },
              scores: true,
            },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!tournament) return;

  // Live matches (all non-PENDING, non-FINISHED)
  const liveMatches = tournament.rounds.flatMap((r) =>
    r.matches
      .filter((m) => m.status !== "PENDING")
      .map((m) => {
        const p1 = m.players[0];
        const p2 = m.players[1];
        const s1 = m.scores.find((s) => s.playerId === p1?.playerId);
        const s2 = m.scores.find((s) => s.playerId === p2?.playerId);
        const qState = currentQuestionState.get(m.id) ?? { index: 0, total: QUESTIONS_PER_MATCH };
        const answered = questionAnswers.get(m.id)?.get(qState.index) ?? new Set<string>();

        return {
          matchId: m.id,
          roundName: r.name,
          status: m.status,
          questionIndex: qState.index,
          totalQuestions: qState.total,
          p1: {
            playerId: p1?.playerId ?? "",
            displayName: p1?.player.displayName ?? "TBD",
            answered: answered.has(p1?.playerId ?? ""),
            totalPoints: s1?.totalPoints ?? 0,
            correctAnswers: s1?.correctAnswers ?? 0,
          },
          p2: {
            playerId: p2?.playerId ?? "",
            displayName: p2?.player.displayName ?? "TBD",
            answered: answered.has(p2?.playerId ?? ""),
            totalPoints: s2?.totalPoints ?? 0,
            correctAnswers: s2?.correctAnswers ?? 0,
          },
          winnerId: m.winnerId,
        };
      })
  );

  // Standings: sum points from all matches in this tournament
  const allMatches = tournament.rounds.flatMap((r) => r.matches);
  const standings = tournament.players
    .map((tp) => {
      const playerScores = allMatches.flatMap((m) => m.scores.filter((s) => s.playerId === tp.playerId));
      const totalPoints = playerScores.reduce((sum, s) => sum + s.totalPoints, 0);
      const correctAnswers = playerScores.reduce((sum, s) => sum + s.correctAnswers, 0);
      const matchesWon = allMatches.filter((m) => m.winnerId === tp.playerId).length;
      const matchesPlayed = allMatches.filter(
        (m) => m.status === "FINISHED" && m.players.some((p) => p.playerId === tp.playerId)
      ).length;

      return {
        playerId: tp.playerId,
        displayName: tp.player.displayName,
        totalPoints,
        correctAnswers,
        matchesWon,
        matchesPlayed,
        isEliminated: tp.isEliminated,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.matchesWon - a.matchesWon);

  io.to(`spectator:${tournamentId}`).emit("spectator:liveUpdate", { matches: liveMatches, standings });
}
