"use client";

import { useMemo, useState } from "react";
import type {
  AnswerInput,
  GradeReport,
  Question,
  QuestionSet,
} from "@/lib/types";

function paraLabel(paras: number[]) {
  const sorted = Array.from(new Set(paras)).sort((a, b) => a - b);
  const oneBased = sorted.map((p) => p + 1);
  if (oneBased.length === 0) return "—";
  if (oneBased.length === 1) return `Paragraph ${oneBased[0]}`;
  return `Paragraphs ${oneBased.join(", ")}`;
}

export default function QuestionsPanel({
  passageId,
  paragraphs,
  evidenceSectionLookup,
  ensureChunked,
}: {
  passageId: string;
  paragraphs: string[] | null;
  evidenceSectionLookup: ((paras: number[]) => string[]) | null;
  ensureChunked: () => Promise<string[]>;
}) {
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GradeReport | null>(null);

  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  const questions: Question[] = set?.questions ?? [];
  const canGenerate = !set || !!report;

  function toggleHint(questionId: string) {
    setOpenHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  const resultMap = useMemo(() => {
    if (!report) return new Map<string, GradeReport["results"][number]>();
    return new Map(report.results.map((r) => [r.questionId, r]));
  }, [report]);

  function setMCQAnswer(questionId: string, idx: number | null) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, format: "mcq", answerIndex: idx },
    }));
  }

  function setShortAnswer(questionId: string, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, format: "short", answerText: text },
    }));
  }

  async function generateQuestions() {
    setLoadingGen(true);
    setError(null);
    setReport(null);
    setAnswers({});
    setOpenHints({});

    try {
      const paras = paragraphs ?? (await ensureChunked());
      const avoidPrompts = set ? set.questions.map((q) => q.prompt) : [];

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageId,
          paragraphs: paras,
          countMin: 5,
          countMax: 7,
          avoidPrompts,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error ?? "Failed to generate questions.");

      const qs = data as QuestionSet;
      setSet(qs);

      const init: Record<string, AnswerInput> = {};
      for (const q of qs.questions) {
        init[q.id] =
          q.format === "mcq"
            ? { questionId: q.id, format: "mcq", answerIndex: null }
            : { questionId: q.id, format: "short", answerText: "" };
      }
      setAnswers(init);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate questions.");
    } finally {
      setLoadingGen(false);
    }
  }

  async function gradeQuestions() {
    if (!set) return;

    setLoadingGrade(true);
    setError(null);

    try {
      const paras = paragraphs ?? (await ensureChunked());

      const res = await fetch("/api/grade-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageId,
          paragraphs: paras,
          questions: set.questions,
          answers: Object.values(answers),
        }),
      });

      const raw = await res.text();

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server returned non-JSON (status ${
            res.status
          }). First 200 chars:\n${raw.slice(0, 200)}`
        );
      }

      if (!res.ok) throw new Error(data?.error ?? "Failed to grade.");

      const nextReport = data as GradeReport;
      setReport(nextReport);

      setOpenHints((prev) => {
        const next = { ...prev };
        for (const r of nextReport.results) {
          if (!r.isCorrect) next[r.questionId] = true;
        }
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to grade.");
    } finally {
      setLoadingGrade(false);
    }
  }

  function evidenceChips(evidenceParas: number[]) {
    const sectionLabels = evidenceSectionLookup
      ? evidenceSectionLookup(evidenceParas)
      : [];
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="rounded-full border px-2 py-1">
          {paraLabel(evidenceParas)}
        </span>
        {sectionLabels.map((label) => (
          <span key={label} className="rounded-full border px-2 py-1">
            Section: {label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Questions</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Generate questions, answer them, then grade.
          </p>
        </div>

        <button
          onClick={generateQuestions}
          disabled={loadingGen || !canGenerate}
          className="rounded-lg border px-3 py-2 text-xs hover:bg-neutral-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
          title={
            !canGenerate
              ? "Grade the current question set before generating a new one."
              : ""
          }
        >
          {set
            ? loadingGen
              ? "Generating…"
              : "Generate new questions"
            : loadingGen
            ? "Generating…"
            : "Generate questions"}
        </button>
      </div>

      {set && !report && (
        <div className="mt-2 text-xs text-neutral-500">
          Grade this set to unlock “Generate new questions”.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!set && (
        <div className="mt-4 rounded-lg border p-3 text-sm text-neutral-600">
          No questions yet. Click <b>Generate questions</b>.
        </div>
      )}

      {report && (
        <div className="mt-4 rounded-lg border p-3">
          <div className="text-sm font-medium">
            Score: {report.summary.correct}/{report.summary.total} (
            {report.summary.percent}%)
          </div>
        </div>
      )}

      {set && !report && (
        <button
          onClick={gradeQuestions}
          disabled={loadingGrade}
          className={[
            "mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold",
            "border border-green-500/40 bg-green-500/15 text-green-100",
            "hover:bg-green-500/20 hover:border-green-500/60",
            "focus:outline-none focus:ring-2 focus:ring-green-500/40",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "shadow-[0_0_0_1px_rgba(34,197,94,0.12),0_10px_25px_-15px_rgba(34,197,94,0.35)]",
          ].join(" ")}
        >
          {loadingGrade ? "Grading…" : "Grade questions"}
        </button>
      )}

      <div className="mt-4 space-y-5">
        {questions.map((q, idx) => {
          const r = resultMap.get(q.id);
          const isGraded = !!r;

          return (
            <div key={q.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium">
                  {idx + 1}. {q.prompt}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border px-2 py-1 text-[11px] text-neutral-500">
                    {q.format.toUpperCase()}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleHint(q.id)}
                    className="rounded-lg border px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-900/20"
                  >
                    {openHints[q.id] ? "Hide hint" : "Hint"}
                  </button>

                  {isGraded && (
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] ${
                        r!.isCorrect
                          ? "border-green-500/40 bg-green-500/10 text-green-200"
                          : "border-red-500/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {r!.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-neutral-500">
                Difficulty: {q.difficulty} • Type: {q.type}
              </div>

              {q.format === "mcq" && (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const a = answers[q.id];
                    const chosenIndex =
                      a && a.format === "mcq" ? a.answerIndex : null;
                    const chosen = chosenIndex === optIdx;

                    const correctIdx = q.correctOptionIndex;
                    const isCorrectOpt = isGraded && optIdx === correctIdx;
                    const isChosenWrong =
                      isGraded &&
                      chosen &&
                      chosenIndex !== null &&
                      chosenIndex !== correctIdx;

                    const base =
                      "flex items-start gap-2 rounded-md border p-2 text-sm text-neutral-100 hover:bg-neutral-900/20";

                    const selected =
                      !isGraded && chosen
                        ? "bg-neutral-900/30 border-neutral-600"
                        : "";
                    const correctStyle = isCorrectOpt
                      ? "border-green-500/40 bg-green-500/10"
                      : "";
                    const wrongStyle = isChosenWrong
                      ? "border-red-500/40 bg-red-500/10"
                      : "";

                    return (
                      <label
                        key={optIdx}
                        onClick={(e) => {
                          e.preventDefault();
                          if (isGraded) return;
                          setMCQAnswer(q.id, chosen ? null : optIdx);
                        }}
                        className={[base, selected, wrongStyle, correctStyle]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          disabled={isGraded}
                          checked={chosen}
                          readOnly
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap">{opt}</div>

                          {isGraded && (chosen || isCorrectOpt) && (
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-neutral-400">
                              {chosen && (
                                <span
                                  className={[
                                    "rounded-full border px-2 py-0.5",
                                    isChosenWrong
                                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                                      : "border-green-500/40 bg-green-500/10 text-green-200",
                                  ].join(" ")}
                                >
                                  Your answer
                                </span>
                              )}
                              {isCorrectOpt && (
                                <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-green-200">
                                  Correct answer
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.format === "short" && (
                <div className="mt-3">
                  <textarea
                    className="min-h-[84px] w-full rounded-lg border bg-transparent p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                    disabled={isGraded}
                    value={
                      answers[q.id] && answers[q.id].format === "short"
                        ? (answers[q.id] as any).answerText
                        : ""
                    }
                    onChange={(e) => setShortAnswer(q.id, e.target.value)}
                    placeholder="Type your answer…"
                  />
                </div>
              )}

              {openHints[q.id] && evidenceChips(q.evidenceParagraphs)}

              {isGraded && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="text-xs font-semibold text-neutral-500">
                      Model answer
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">
                      {r!.modelAnswer}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 text-sm">
                    <div className="text-xs font-semibold text-neutral-500">
                      Feedback
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">
                      {r!.feedback}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-xs text-neutral-500">
                      {r!.explanation}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
