import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/app/lib/prisma";
import { updateQuestion } from "@/app/actions/admin";
import { QuestionForm } from "../_components/QuestionForm";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Admin — Editar pregunta" };

export default async function EditQuestionPage({ params }: Props) {
  const { id } = await params;

  const [question, categories] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  if (!question) notFound();

  const boundAction = updateQuestion.bind(null, id);

  return (
    <QuestionForm
      action={boundAction}
      categories={categories}
      title="Editar pregunta"
      initialData={{
        text: question.text,
        categoryId: question.categoryId,
        difficulty: question.difficulty,
        timeLimit: question.timeLimit,
        basePoints: question.basePoints,
        imageUrl: question.imageUrl,
        options: question.options.map((o) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order,
        })),
      }}
    />
  );
}
