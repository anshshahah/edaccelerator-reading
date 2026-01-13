import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai";
import type { ChunkedPassageResult, ThematicChunkPlan } from "@/lib/types";

const Schema = z
  .object({
    paragraphs: z
      .array(
        z
          .object({
            text: z.string().min(1),
            idea: z.string().min(3).max(80),
          })
          .strict()
      )
      .min(2),
    sections: z
      .object({
        chunks: z
          .array(
            z
              .object({
                id: z.string().min(1),
                label: z.string().min(3).max(80),
                startPara: z.number().int().nonnegative(),
                endPara: z.number().int().nonnegative(),
              })
              .strict()
          )
          .min(1),
      })
      .strict(),
  })
  .strict();

function validateSections(plan: ThematicChunkPlan, paraCount: number): ThematicChunkPlan {
  const sorted = [...plan.chunks].sort((a, b) => a.startPara - b.startPara);

  if (sorted[0].startPara !== 0) throw new Error("Sections must start at paragraph 0.");
  if (sorted[sorted.length - 1].endPara !== paraCount - 1) {
    throw new Error("Sections must end at the last paragraph.");
  }

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (c.startPara > c.endPara) throw new Error("Section has startPara > endPara.");
    if (c.endPara >= paraCount) throw new Error("Section out of bounds.");
    if (i > 0) {
      const prev = sorted[i - 1];
      if (c.startPara !== prev.endPara + 1) {
        throw new Error("Sections must be contiguous with no gaps/overlaps.");
      }
    }
  }

  return {
    chunks: sorted.map((c, idx) => ({ ...c, id: `c${idx + 1}` })),
  };
}

export async function chunkPassageIntoParagraphsAI(passageText: string): Promise<ChunkedPassageResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");

  const model = process.env.OPENAI_CHUNK_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    temperature: 0.5,
    input: [
      {
        role: "system",
        content: [
          "You are a reading tutor.",
          "Split the passage into clear paragraphs and label the main idea of each paragraph.",
          "Also group consecutive paragraphs into 2–4 thematic sections.",
          "Return ONLY JSON matching the schema.",
          "",
          "Rules:",
          "- Preserve meaning and order.",
          "- Each paragraph's idea should be short (3–6 words).",
          "- Section labels should be short (3–6 words).",
          "- Sections must cover all paragraphs exactly once and be contiguous.",
        ].join("\n"),
      },
      { role: "user", content: passageText },
    ],
    text: { format: zodTextFormat(Schema, "chunked_passage") },
  });

  const parsed = response.output_parsed as z.infer<typeof Schema> | undefined;
  if (!parsed) throw new Error("No parsed chunking result returned.");

  const paraCount = parsed.paragraphs.length;
  const sections = validateSections(parsed.sections, paraCount);

  return {
    paragraphs: parsed.paragraphs.map((p) => ({
      text: p.text.trim(),
      idea: p.idea.trim(),
    })),
    sections,
  };
}
