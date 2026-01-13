import type { ChunkedPassageResult } from "@/lib/types";

type Entry = { value: ChunkedPassageResult; createdAt: number };
const cache = new Map<string, Entry>();

const TTL_MS = 1000 * 60 * 60; // 1 hour

export function getChunkedPassage(key: string) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.createdAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return e.value;
}

export function setChunkedPassage(key: string, value: ChunkedPassageResult) {
  cache.set(key, { value, createdAt: Date.now() });
}
