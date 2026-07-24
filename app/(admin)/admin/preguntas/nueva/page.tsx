import type { Metadata } from "next";
import prisma from "@/app/lib/prisma";
import { createQuestion } from "@/app/actions/admin";
import { QuestionForm } from "../_components/QuestionForm";

export const metadata: Metadata = { title: "Admin — Nueva pregunta" };

export default async function NewQuestionPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return <QuestionForm action={createQuestion} categories={categories} title="Nueva pregunta" />;
}
