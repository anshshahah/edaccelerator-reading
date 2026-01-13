import { NextResponse } from "next/server";
import { z } from "zod";
import { passages } from "@/data/passages";
import type { QuestionSet } from "@/lib/types";
import { generateQuestionsAI } from "@/lib/ai/questionGeneration";

export const runtime = "nodejs";
export const maxDuration = 60;


const BodySchema = z.object({
  passageId: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(2),
  countMin: z.number().int().min(5).max(7).optional(),
  countMax: z.number().int().min(5).max(7).optional(),
  avoidPrompts: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json());

  const passage = passages[body.passageId as keyof typeof passages];
  if (!passage) {
    return NextResponse.json({ error: "Passage not found" }, { status: 404 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing. Add it to .env.local and restart dev server." },
      { status: 500 }
    );
  }

  const setId = crypto.randomUUID();
  const createdAt = Date.now();

  try {
    const questions = await generateQuestionsAI(body.paragraphs, {
      countMin: body.countMin ?? 5,
      countMax: body.countMax ?? 7,
      avoidPrompts: body.avoidPrompts ?? [],
      nonce: setId,
    });

    const set: QuestionSet = {
      setId,
      passageId: passage.id,
      createdAt,
      source: "ai",
      questions,
    };

    return NextResponse.json(set);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", issues: err.issues },
        { status: 400 }
      );
    }

    const message = err?.message ?? "Unknown error";
    const status = typeof err?.status === "number" ? err.status : 500;
    const code = err?.code ?? err?.error?.code;

    return NextResponse.json({ error: message, code }, { status });
  }
}
