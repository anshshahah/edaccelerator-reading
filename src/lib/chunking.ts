import { Chunk } from "./types";

export function chunkByParagraphs(
  content: string,
  paragraphsPerChunk = 3
): Chunk[] {
  const paras = content
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let cursor = 0;

  // build with double newlines to get indices consistently
  const rebuilt = paras.join("\n\n");

  for (let i = 0; i < paras.length; i += paragraphsPerChunk) {
    const slice = paras.slice(i, i + paragraphsPerChunk);
    const text = slice.join("\n\n");

    const start = rebuilt.indexOf(text, cursor);
    const end = start + text.length;
    cursor = end;

    chunks.push({
      id: `c${Math.floor(i / paragraphsPerChunk) + 1}`,
      label: `Section ${Math.floor(i / paragraphsPerChunk) + 1}`,
      start,
      end,
      text,
    });
  }

  return chunks;
}
