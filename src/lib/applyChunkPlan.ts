import { Chunk, ThematicChunkPlan } from "@/lib/types";

export function chunksFromPlan(
  paragraphs: string[],
  plan: ThematicChunkPlan
): Chunk[] {
  const rebuilt = paragraphs.join("\n\n");

  return plan.chunks.map((c) => {
    const text = paragraphs.slice(c.startPara, c.endPara + 1).join("\n\n");

    const start = rebuilt.indexOf(text);
    const end = start >= 0 ? start + text.length : 0;

    return {
      id: c.id,
      label: c.label,
      start,
      end,
      text,
    };
  });
}
