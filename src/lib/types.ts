
export type PassageData = {
  id: string;
  title: string;
  text: string;
};

export type ParagraphWithIdea = {
  text: string;
  idea: string;
};

export type ThematicChunk = {
  id: string;
  label: string;
  startPara: number;
  endPara: number;
};

export type ThematicChunkPlan = {
  chunks: ThematicChunk[];
};

export type ChunkedPassageResult = {
  paragraphs: ParagraphWithIdea[];
  sections: ThematicChunkPlan;
};

export type QuestionType =
  | "inference"
  | "main_idea"
  | "detail_with_evidence"
  | "vocab_in_context"
  | "sequence"
  | "why/how";

export type QuestionCommon = {
  id: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  explanation: string;
  evidenceParagraphs: number[];
};

export type MCQQuestion = QuestionCommon & {
  format: "mcq";
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
};

export type ShortAnswerQuestion = QuestionCommon & {
  format: "short";
  modelAnswer: string;
  rubric: string[];
};

export type Question = MCQQuestion | ShortAnswerQuestion;

export type QuestionSet = {
  setId: string;
  passageId: string;
  createdAt: number;
  source: "ai";
  questions: Question[];
};

export type AnswerInput =
  | { questionId: string; format: "mcq"; answerIndex: number | null }
  | { questionId: string; format: "short"; answerText: string };

export type GradeItem = {
  questionId: string;
  isCorrect: boolean;
  score01: number;
  feedback: string;
  correctAnswer: string;
  modelAnswer: string;
  evidenceParagraphs: number[];
  explanation: string;
};

export type GradeSummary = {
  correct: number;
  total: number;
  percent: number;
};

export type GradeReport = {
  setId: string;
  summary: GradeSummary;
  results: GradeItem[];
};
