import sample from "./sample.json";

export const passages = {
  [sample.id]: sample,
} as const;

export type PassageId = keyof typeof passages;
