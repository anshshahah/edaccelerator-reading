import { NextResponse } from "next/server";
import { z } from "zod";
import type { GradeItem, GradeReport } from "@/lib/types";
import { openai } from "@/lib/ai/openai";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "nodejs";

const QuestionCommonSchema = z.object({
  id: z.string().min(1),
  format: z.enum(["mcq", "short"]),
  type: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
  evidenceParagraphs: z.array(z.number().int().min(0)).min(1),
});

const MCQQuestionSchema = QuestionCommonSchema.extend({
  format: z.literal("mcq"),
  options: z.array(z.string().min(1)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
});

const ShortQuestionSchema = QuestionCommonSchema.extend({
  format: z.literal("short"),
  modelAnswer: z.string().min(1),
  rubric: z.array(z.string().min(1)).min(2).max(5),
});

const QuestionSchema = z.discriminatedUnion("format", [
  MCQQuestionSchema,
  ShortQuestionSchema,
]);

const BodySchema = z.object({
  passageId: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(2),
  questions: z.array(QuestionSchema).min(1),
  answers: z.array(
    z.discriminatedUnion("format", [
      z.object({
        questionId: z.string().min(1),
        format: z.literal("mcq"),
        answerIndex: z.number().int().min(0).max(3).nullable(),
      }),
      z.object({
        questionId: z.string().min(1),
        format: z.literal("short"),
        answerText: z.string(),
      }),
    ])
  ),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing. Cannot grade." },
        { status: 500 }
      );
    }

    const answerMap = new Map(body.answers.map((a) => [a.questionId, a]));
    const results: GradeItem[] = [];

    const shortItems: Array<{
      questionId: string;
      prompt: string;
      userAnswer: string;
      modelAnswer: string;
      rubric: string[];
      evidenceParagraphs: number[];
      evidenceText: string;
    }> = [];

    for (const q of body.questions) {
      const a = answerMap.get(q.id);

      if (q.format === "mcq") {
        const userIndex = a && a.format === "mcq" ? a.answerIndex : null;
        const isCorrect = userIndex === q.correctOptionIndex;

        results.push({
          questionId: q.id,
          isCorrect,
          score01: isCorrect ? 1 : 0,
          feedback:
            userIndex === null
              ? "No answer selected."
              : isCorrect
                ? "Correct."
                : "Incorrect.",
          correctAnswer: q.options[q.correctOptionIndex],
          modelAnswer: q.options[q.correctOptionIndex],
          evidenceParagraphs: q.evidenceParagraphs,
          explanation: q.explanation,
        });
      } else {
        const userAnswer =
          a && a.format === "short" ? a.answerText.trim() : "";

        const evParas = Array.from(new Set(q.evidenceParagraphs))
          .filter((n) => n >= 0 && n < body.paragraphs.length)
          .slice(0, 4);

        const evidenceText = evParas
          .map((idx) => `[${idx}] ${body.paragraphs[idx]}`)
          .join("\n\n");

        shortItems.push({
          questionId: q.id,
          prompt: q.prompt,
          userAnswer,
          modelAnswer: q.modelAnswer,
          rubric: q.rubric,
          evidenceParagraphs: evParas,
          evidenceText,
        });

        results.push({
          questionId: q.id,
          isCorrect: false,
          score01: 0,
          feedback: "Not graded yet.",
          correctAnswer: q.modelAnswer,
          modelAnswer: q.modelAnswer,
          evidenceParagraphs: q.evidenceParagraphs,
          explanation: q.explanation,
        });
      }
    }

    if (shortItems.length > 0) {
      const GradeSchema = z.object({
        results: z.array(
          z.object({
            questionId: z.string(),
            isCorrect: z.boolean(),
            score01: z.number().min(0).max(1),
            feedback: z.string().min(5),
          })
        ),
      });

      const model = process.env.OPENAI_GRADE_MODEL || "gpt-4o-mini";

      const response = await openai.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: [
              "You are grading short-answer reading comprehension responses.",
              "You MUST base grading ONLY on the provided evidence text.",
              "Use the rubric and model answer as the marking guide.",
              "If the student's answer is not supported by the evidence text, mark incorrect.",
              "Return ONLY JSON matching the schema.",
              "Feedback should be concise and actionable.",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              items: shortItems.map((x) => ({
                questionId: x.questionId,
                prompt: x.prompt,
                userAnswer: x.userAnswer,
                modelAnswer: x.modelAnswer,
                rubric: x.rubric,
                evidenceParagraphs: x.evidenceParagraphs,
                evidenceText: x.evidenceText,
              })),
            }),
          },
        ],
        text: { format: zodTextFormat(GradeSchema, "grade_report") },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        return NextResponse.json(
          { error: "AI grading failed: no parsed results." },
          { status: 502 }
        );
      }

      const gradeMap = new Map(parsed.results.map((r) => [r.questionId, r]));

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const g = gradeMap.get(r.questionId);
        if (!g) continue;

        results[i] = {
          ...r,
          isCorrect: g.isCorrect,
          score01: g.score01,
          feedback: g.feedback,
        };
      }
    }

    const correct = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    const report: GradeReport = {
      setId: "stateless",
      summary: { correct, total, percent },
      results,
    };

    return NextResponse.json(report);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload for grading.", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err?.message ?? "Unexpected grading error." },
      { status: 500 }
    );
  }
}
