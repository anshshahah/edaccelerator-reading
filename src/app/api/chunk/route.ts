import { NextResponse } from "next/server";
import { z } from "zod";
import { passages } from "@/data/passages";
import { chunkPassageIntoParagraphsAI } from "@/lib/ai/thematicChunking";
import { getChunkedPassage, setChunkedPassage } from "@/lib/ai/chunkCache";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  passageId: z.string().min(1),
});

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const passage = passages[body.passageId as keyof typeof passages];

    if (!passage) {
      return NextResponse.json({ error: "Passage not found" }, { status: 404 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing. Add it in Vercel env vars." },
        { status: 500 }
      );
    }

    const cacheKey = `${passage.id}:${hashText(passage.text)}`;

    const cached = getChunkedPassage(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const result = await chunkPassageIntoParagraphsAI(passage.text);
    setChunkedPassage(cacheKey, result);

    return NextResponse.json({ ...result, cached: false });
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
