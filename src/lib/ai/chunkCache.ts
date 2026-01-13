import type { ThematicChunkPlan } from "@/lib/types";

const cache = new Map<string, ThematicChunkPlan>();

export function getCachedPlan(key: string): ThematicChunkPlan | undefined {
  return cache.get(key);
}

export function setCachedPlan(key: string, plan: ThematicChunkPlan) {
  cache.set(key, plan);
}
