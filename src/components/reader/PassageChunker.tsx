"use client";

import { useState } from "react";
import type { Chunk, ThematicChunkPlan } from "@/lib/types";
import { chunksFromPlan } from "@/lib/applyChunkPlan";

export default function PassageChunker({
  passageId,
  title,
  paragraphs,
}: {
  passageId: string;
  title: string;
  paragraphs: string[];
}) {
  const [plan, setPlan] = useState<ThematicChunkPlan | null>(null);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chunkWithAI() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Common case: insufficient_quota
        const msg = data?.error ?? "AI chunking failed";
        const code = data?.code ? ` (${data.code})` : "";
        throw new Error(`${msg}${code}`);
      }

      const nextPlan = data.plan as ThematicChunkPlan;
      setPlan(nextPlan);
      setChunks(chunksFromPlan(paragraphs, nextPlan));
    } catch (e: any) {
      setError(e?.message ?? "AI chunking failed.");
      setPlan(null);
      setChunks(null);
    } finally {
      setLoading(false);
    }
  }

  function showFullPassage() {
    setPlan(null);
    setChunks(null);
    setError(null);
  }

  const isChunked = !!chunks;

  return (
    <section className= "rounded-xl border p-4" >
    <div className="flex items-start justify-between gap-3" >
      <div>
      <h2 className="font-medium" > Passage </h2>
        < p className = "mt-1 text-xs text-neutral-500" >
        {
          isChunked
          ? "AI has grouped the passage into thematic sections."
            : "Reading the full passage. You can optionally chunk it by theme."
        }
          </p>
          </div>

          < div className = "flex gap-2" >
            {!isChunked ? (
              <button
              onClick= { chunkWithAI }
              disabled = { loading }
  className = "rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50 disabled:opacity-60"
    >
    { loading? "Chunking…": "Chunk with AI" }
    </button>
          ) : (
    <button
              onClick= { showFullPassage }
  className = "rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50"
    >
    Show full passage
      </button>
          )
}
</div>
  </div>

{
  error && (
    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" >
      { error }
      </div>
      )
}

<div className="mt-4 space-y-5 text-sm leading-6" >
  {!isChunked ? (
    paragraphs.map((p, idx) => (
      <p key= { idx } className = "whitespace-pre-wrap" >
      { p }
      </p>
    ))
        ) : (
  chunks!.map((c) => (
    <div key= { c.id } >
    <div className="mb-1 text-xs font-semibold text-neutral-400" >
    { c.label }
    </div>
  < p className = "whitespace-pre-wrap" > { c.text } </p>
  </div>
  ))
        )}
</div>
  </section>
  );
}
