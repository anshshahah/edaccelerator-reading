import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./openai";
import type { Question, QuestionType } from "@/lib/types";


const QuestionTypeEnum = z.enum([
  "inference",
  "main_idea",
  "detail_with_evidence",
  "vocab_in_context",
  "sequence",
  "why/how",
]);

const FlatQuestionSchema = z
  .object({
    format: z.enum(["mcq", "short"]),
    type: QuestionTypeEnum,
    difficulty: z.number().int().min(1).max(3),
    prompt: z.string().min(8),
    explanation: z.string().min(10),
    evidenceParagraphs: z.array(z.number().int().min(0)).min(1),

    options: z.array(z.string().min(1)).length(4).nullable(),
    correctOptionIndex: z.number().int().min(0).max(3).nullable(),
    modelAnswer: z.string().min(8).nullable(),
    rubric: z.array(z.string().min(3)).min(2).max(5).nullable(),
  })
  .strict();

const QuestionSetSchema = z
  .object({
    questions: z.array(FlatQuestionSchema).min(5).max(7),
  })
  .strict();

type ParsedSet = z.infer<typeof QuestionSetSchema>;
type ParsedQuestion = z.infer<typeof FlatQuestionSchema>;

function normalizeEvidence(evidence: number[], paraCount: number) {
  return Array.from(new Set(evidence))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < paraCount)
    .slice(0, 4);
}

function assertValidQuestion(q: ParsedQuestion, paraCount: number, idx: number): Question {
  const evidence = normalizeEvidence(q.evidenceParagraphs, paraCount);
  if (!evidence.length) throw new Error(`Question ${idx + 1}: evidenceParagraphs out of bounds`);

  const common = {
    id: `q${idx + 1}`,
    type: q.type as QuestionType,
    difficulty: q.difficulty as 1 | 2 | 3,
    prompt: q.prompt.trim(),
    explanation: q.explanation.trim(),
    evidenceParagraphs: evidence,
  };

  if (q.format === "mcq") {
    if (q.options === null) throw new Error(`Question ${idx + 1}: MCQ options must be present`);
    if (q.correctOptionIndex === null) throw new Error(`Question ${idx + 1}: MCQ correctOptionIndex must be present`);
    if (q.modelAnswer !== null) throw new Error(`Question ${idx + 1}: MCQ modelAnswer must be null`);
    if (q.rubric !== null) throw new Error(`Question ${idx + 1}: MCQ rubric must be null`);

    return {
      ...common,
      format: "mcq",
      options: q.options.map((s) => s.trim()) as [string, string, string, string],
      correctOptionIndex: q.correctOptionIndex as 0 | 1 | 2 | 3,
    };
  }


  if (q.modelAnswer === null) throw new Error(`Question ${idx + 1}: short modelAnswer must be present`);
  if (q.rubric === null) throw new Error(`Question ${idx + 1}: short rubric must be present`);
  if (q.options !== null) throw new Error(`Question ${idx + 1}: short options must be null`);
  if (q.correctOptionIndex !== null) throw new Error(`Question ${idx + 1}: short correctOptionIndex must be null`);

  return {
    ...common,
    format: "short",
    modelAnswer: q.modelAnswer.trim(),
    rubric: q.rubric.map((r) => r.trim()).slice(0, 5),
  };
}

export async function generateQuestionsAI(
  paragraphs: string[],
  opts: {
    countMin?: number;
    countMax?: number;
    avoidPrompts?: string[];
    nonce?: string;
  } = {}
): Promise<Question[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");

  const countMin = opts.countMin ?? 5;
  const countMax = opts.countMax ?? 7;
  const avoidPrompts = (opts.avoidPrompts ?? []).slice(0, 12);
  const nonce = opts.nonce ?? crypto.randomUUID();

  const numbered = paragraphs.map((p, i) => `[${i}] ${p}`).join("\n\n");
  const model = process.env.OPENAI_QUESTION_MODEL || "gpt-4o-mini";

  const response = await openai.responses.parse({
    model,
    temperature: 0.9,
    input: [
      {
        role: "system",
        content: [
          "You create reading comprehension question sets.",
          "Return ONLY JSON matching the schema.",
          "",
          `Create ${countMin}-${countMax} questions mixing multiple-choice and short-answer.`,
          "",
          "CRITICAL OUTPUT RULES:",
          "- Every question MUST include ALL fields: format, type, difficulty, prompt, explanation, evidenceParagraphs, options, correctOptionIndex, modelAnswer, rubric.",
          "- Use null for fields that don't apply:",
          "  - If format='mcq': options array length 4; correctOptionIndex 0..3; modelAnswer=null; rubric=null.",
          "  - If format='short': modelAnswer string; rubric 2–5 items; options=null; correctOptionIndex=null.",
          "- evidenceParagraphs must be valid 0-based indices into the provided paragraphs.",
          "- explanation should justify the answer using the evidence.",
          "- Include BOTH formats (aim for at least 2 mcq and 2 short).",
          "",
          "ANTI-REPEAT:",
          "- Do NOT repeat or closely paraphrase any prompts listed under 'Previous prompts to avoid'.",
          `Variation nonce: ${nonce}`,
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Passage paragraphs:",
          numbered,
          "",
          "Previous prompts to avoid:",
          avoidPrompts.length ? avoidPrompts.map((p) => `- ${p}`).join("\n") : "(none)",
        ].join("\n"),
      },
    ],
    text: { format: zodTextFormat(QuestionSetSchema, "question_set") },
  });

  const parsed = response.output_parsed as ParsedSet | undefined;
  if (!parsed) throw new Error("No parsed questions returned.");

  return parsed.questions.map((q, idx) => assertValidQuestion(q, paragraphs.length, idx));
}
