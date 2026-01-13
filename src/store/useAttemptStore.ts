"use client";

import { create } from "zustand";
import { Attempt, GradeResult } from "@/lib/types";

type State = {
  attempt: Attempt | null;
  currentIndex: number;
  startAttempt: (passageId: string) => void;
  setIndex: (i: number) => void;
  saveResponse: (
    questionId: string,
    userAnswer: string,
    grade: GradeResult
  ) => void;
  reset: () => void;
};

export const useAttemptStore = create<State>((set, get) => ({
  attempt: null,
  currentIndex: 0,

  startAttempt: (passageId) =>
    set({
      attempt: {
        attemptId: crypto.randomUUID(),
        passageId,
        startedAt: Date.now(),
        responses: [],
      },
      currentIndex: 0,
    }),

  setIndex: (i) => set({ currentIndex: i }),

  saveResponse: (questionId, userAnswer, grade) => {
    const { attempt } = get();
    if (!attempt) return;

    const existingIdx = attempt.responses.findIndex(
      (r) => r.questionId === questionId
    );

    const nextResponses =
      existingIdx >= 0
        ? attempt.responses.map((r, idx) =>
          idx === existingIdx ? { questionId, userAnswer, grade } : r
        )
        : [...attempt.responses, { questionId, userAnswer, grade }];

    set({ attempt: { ...attempt, responses: nextResponses } });
  },

  reset: () => set({ attempt: null, currentIndex: 0 }),
}));
