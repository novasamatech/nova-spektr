import { type Draft } from '@/domains/backend';

export function filterVisibleDrafts(drafts: Draft[], linkedDraftIds: Set<string>, operationsLoaded: boolean): Draft[] {
  if (!operationsLoaded) return [];

  return drafts.filter((d) => !linkedDraftIds.has(d.id));
}
