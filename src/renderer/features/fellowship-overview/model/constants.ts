export const FELLOWSHIP_TABS = {
  RANKS: 'ranks',
  MEMBERS: 'members',
  CODEX: 'codex',
} as const;

export type FellowshipTab = (typeof FELLOWSHIP_TABS)[keyof typeof FELLOWSHIP_TABS];

export const PROGRESS_WITH_DIVIDERS_WIDTHS: Record<number, number> = {
  1: 48,
  2: 88,
  3: 88,
  4: 88,
  5: 88,
  6: 88,
  7: 136,
  8: 168,
  9: 81,
};
