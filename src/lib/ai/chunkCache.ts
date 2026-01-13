import type { ChunkedPassageResult } from "@/lib/types";

type Entry = {
  value: ChunkedPassageResult;
  createdAt: number;
};

const cache = new Map<string, Entry>();

const DEFAULT_TTL_MS = 1000 * 60 * 60;

export function getChunkedPassage(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS
): ChunkedPassageResult | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setChunkedPassage(key: string, value: ChunkedPassageResult) {
  cache.set(key, { value, createdAt: Date.now() });
}

export function clearChunkCache() {
  cache.clear();
}
