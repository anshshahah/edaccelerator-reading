"use client";

import { useMemo, useRef, useState } from "react";
import type { PassageData, ChunkedPassageResult } from "@/lib/types";
import QuestionsPanel from "@/components/questions/QuestionsPanel";

export default function PassageWorkspace({
  passage,
}: {
  passage: PassageData;
}) {
  const [chunked, setChunked] = useState<ChunkedPassageResult | null>(null);
  const [loadingChunk, setLoadingChunk] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);

  const inFlightRef = useRef<Promise<ChunkedPassageResult> | null>(null);

  const isChunked = !!chunked;

  async function fetchChunking(): Promise<ChunkedPassageResult> {
    const res = await fetch("/api/chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passageId: passage.id }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error ?? "AI chunking failed";
      const code = data?.code ? ` (${data.code})` : "";
      throw new Error(`${msg}${code}`);
    }

    return data as ChunkedPassageResult;
  }

  async function ensureChunked(): Promise<ChunkedPassageResult> {
    if (chunked) return chunked;

    if (inFlightRef.current) return await inFlightRef.current;

    setLoadingChunk(true);
    setChunkError(null);

    const p = (async () => {
      try {
        const result = await fetchChunking();
        setChunked(result);
        return result;
      } catch (e: any) {
        setChunkError(e?.message ?? "AI chunking failed.");
        setChunked(null);
        throw e;
      } finally {
        setLoadingChunk(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = p;
    return await p;
  }

  async function chunkWithAIButton() {
    try {
      await ensureChunked();
    } catch {}
  }

  function showFullPassage() {
    setChunked(null);
    setChunkError(null);
  }

  const paragraphsOnly = useMemo(() => {
    if (!chunked) return null;
    return chunked.paragraphs.map((p) => p.text);
  }, [chunked]);

  const evidenceSectionLookup = useMemo(() => {
    if (!chunked) return null;
    return (paras: number[]) => {
      const unique = Array.from(new Set(paras)).sort((a, b) => a - b);
      const labels = new Set<string>();
      for (const c of chunked.sections.chunks) {
        const overlaps = unique.some((p) => p >= c.startPara && p <= c.endPara);
        if (overlaps) labels.add(c.label);
      }
      return Array.from(labels);
    };
  }, [chunked]);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Passage</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {isChunked
                ? "AI split the passage into paragraphs and labeled each main idea."
                : "Full passage view. Click ‘Chunk with AI’ (or generate questions) to split + theme it."}
            </p>
          </div>

          <div className="flex gap-2">
            {!isChunked ? (
              <button
                onClick={chunkWithAIButton}
                disabled={loadingChunk}
                className="rounded-lg border px-3 py-2 text-xs hover:bg-neutral-900/20 disabled:opacity-60"
              >
                {loadingChunk ? "Chunking…" : "Chunk with AI"}
              </button>
            ) : (
              <button
                onClick={showFullPassage}
                className="rounded-lg border px-3 py-2 text-xs hover:bg-neutral-900/20"
              >
                Show full passage
              </button>
            )}
          </div>
        </div>

        {chunkError && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {chunkError}
          </div>
        )}

        <div className="mt-4 space-y-5 text-sm leading-6">
          {!isChunked ? (
            <p className="whitespace-pre-wrap">{passage.text}</p>
          ) : (
            chunked.sections.chunks.map((sec) => (
              <div key={sec.id} className="space-y-4">
                <div className="text-xs font-semibold text-neutral-400">
                  {sec.label}
                </div>

                {chunked.paragraphs
                  .slice(sec.startPara, sec.endPara + 1)
                  .map((p, i) => {
                    const absoluteIndex = sec.startPara + i;
                    return (
                      <div key={absoluteIndex}>
                        <div className="mb-1 text-[11px] font-semibold text-neutral-500">
                          Paragraph {absoluteIndex + 1}: {p.idea}
                        </div>
                        <p className="whitespace-pre-wrap">{p.text}</p>
                      </div>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </section>

      <QuestionsPanel
        passageId={passage.id}
        paragraphs={paragraphsOnly}
        evidenceSectionLookup={evidenceSectionLookup}
        ensureChunked={async () => {
          const res = await ensureChunked();
          return res.paragraphs.map((p) => p.text);
        }}
      />
    </div>
  );
}
