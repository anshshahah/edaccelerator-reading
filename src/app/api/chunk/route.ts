import { NextResponse } from "next/server";
import { z } from "zod";
import { passages } from "@/data/passages";
import { generateThematicChunkPlan } from "@/lib/ai/thematicChunking";
import { getCachedPlan, setCachedPlan } from "@/lib/ai/chunkCache";

export const runtime = "nodejs";

const BodySchema = z.object({
  passageId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const passage = passages[body.passageId as keyof typeof passages];

    if (!passage) {
      return NextResponse.json({ error: "Passage not found" }, { status: 404 });
    }

    const cacheKey = `chunkplan:${body.passageId}:min1max3`;
    const cached = getCachedPlan(cacheKey);
    if (cached) {
      return NextResponse.json({ plan: cached, cached: true });
    }

    const plan = await generateThematicChunkPlan(passage.paragraphs, {
      minParasPerChunk: 1,
      maxParasPerChunk: 3,
    });

    setCachedPlan(cacheKey, plan);

    return NextResponse.json({ plan, cached: false });
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    const status = err?.status ?? 500;
    const code = err?.code ?? undefined;

    return NextResponse.json(
      { error: message, code },
      { status: typeof status === "number" ? status : 500 }
    );
  }
}
