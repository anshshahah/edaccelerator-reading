export type Chunk = {
  id: string;
  label: string;
  start: number;
  end: number;
  text: string;
};

export type PassageData = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type QuestionType =
  | "inference"
  | "main_idea"
  | "detail_with_evidence"
  | "vocab_in_context"
  | "sequence"
  | "why/how";

export type Question = {
  id: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  expectedAnswer: string;
  rubric: string[];
  evidenceChunkIds: string[];
  explanation: string;
};

export type GradeResult = {
  isCorrect: boolean;
  score01: number;
  feedback: string;
  evidenceChunkIds: string[];
};

export type AttemptResponse = {
  questionId: string;
  userAnswer: string;
  grade: GradeResult;
};

export type Attempt = {
  attemptId: string;
  passageId: string;
  startedAt: number;
  responses: AttemptResponse[];
};
