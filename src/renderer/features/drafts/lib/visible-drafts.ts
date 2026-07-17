import { type Draft } from '@/domains/backend';

/** A draft is pending until an operation links back to it. */
export function filterVisibleDrafts(drafts: Draft[]): Draft[] {
  return drafts.filter((d) => d.operation === null);
}
