import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai";
import type { ThematicChunkPlan } from "@/lib/types";

const ChunkPlanSchema = z.object({
  chunks: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1).max(80),
      startPara: z.number().int().nonnegative(),
      endPara: z.number().int().nonnegative(),
    })
  ).min(1),
});

function validateAndNormalizePlan(
  plan: ThematicChunkPlan,
  paraCount: number,
  minParasPerChunk: number,
  maxParasPerChunk: number
): ThematicChunkPlan {
  const sorted = [...plan.chunks].sort((a, b) => a.startPara - b.startPara);

  if (sorted[0].startPara !== 0) throw new Error("Chunk plan must start at paragraph 0.");
  if (sorted[sorted.length - 1].endPara !== paraCount - 1)
    throw new Error("Chunk plan must end at the last paragraph.");

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (c.startPara > c.endPara) throw new Error("Chunk has startPara > endPara.");
    if (c.startPara < 0 || c.endPara >= paraCount) throw new Error("Chunk out of bounds.");

    const size = c.endPara - c.startPara + 1;
    if (size < minParasPerChunk || size > maxParasPerChunk) {
      throw new Error(`Chunk size ${size} not in [${minParasPerChunk}, ${maxParasPerChunk}].`);
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (c.startPara !== prev.endPara + 1) {
        throw new Error("Chunks must be contiguous with no gaps/overlaps.");
      }
    }
  }

  // normalize ids
  return {
    chunks: sorted.map((c, idx) => ({ ...c, id: `c${idx + 1}` })),
  };
}

export async function generateThematicChunkPlan(
  paragraphs: string[],
  opts?: { minParasPerChunk?: number; maxParasPerChunk?: number }
): Promise<ThematicChunkPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY (needed for AI chunking).");
  }

  const minParasPerChunk = opts?.minParasPerChunk ?? 1;
  const maxParasPerChunk = opts?.maxParasPerChunk ?? 3;

  const numbered = paragraphs.map((p, i) => `[${i}] ${p}`).join("\n\n");
  const model = process.env.OPENAI_CHUNK_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: [
          "You are an expert reading tutor.",
          "Chunk the passage into thematic sections that improve comprehension.",
          "Return ONLY the JSON object matching the schema.",
          "",
          "Rules:",
          `- Use between ${minParasPerChunk} and ${maxParasPerChunk} paragraphs per chunk.`,
          "- Chunks MUST be contiguous and cover every paragraph exactly once.",
          "- Do not skip or reorder paragraphs.",
          "- Labels should be short and descriptive (3–6 words).",
        ].join("\n"),
      },
      {
        role: "user",
        content: ["Chunk these paragraphs by theme:", "", numbered].join("\n"),
      },
    ],
    text: { format: zodTextFormat(ChunkPlanSchema, "chunk_plan") },
  });

  const plan = response.output_parsed as ThematicChunkPlan | undefined;
  if (!plan) throw new Error("No parsed chunk plan returned.");

  return validateAndNormalizePlan(plan, paragraphs.length, minParasPerChunk, maxParasPerChunk);
}
