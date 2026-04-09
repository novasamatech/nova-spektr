import { type AccountEntry, type AccountPreset, type PresetFilterCriteria } from './types';

export function applyPresetFilter(filters: PresetFilterCriteria, entries: AccountEntry[]): AccountEntry[] {
  const { sources, entityNames, categoryNames, tags } = filters;
  const needsBackendMetadata = entityNames.length > 0 || categoryNames.length > 0 || tags.length > 0;

  return entries.filter(entry => {
    if (sources.length > 0 && !sources.includes(entry.source)) return false;

    // Only backend-contact entries can match entity/category/tag filters — all
    // other sources carry no such metadata, so they're excluded when any of
    // those filters are set.
    if (!needsBackendMetadata) return true;
    if (entry.source !== 'backend-contact') return false;

    if (entityNames.length > 0 && !entry.entityNames.some(e => entityNames.includes(e))) return false;
    if (categoryNames.length > 0 && (entry.categoryName == null || !categoryNames.includes(entry.categoryName))) {
      return false;
    }
    if (
      tags.length > 0 &&
      !tags.every(t => entry.tags.some(et => et.tagName === t.tagName && t.values.some(v => et.values.includes(v))))
    ) {
      return false;
    }

    return true;
  });
}

export function matchPreset(preset: AccountPreset | null, entries: AccountEntry[]): AccountEntry[] {
  if (!preset) return entries;

  if (preset.type === 'custom') {
    const selected = new Set(preset.selectedIds);
    return entries.filter(e => selected.has(e.id));
  }

  return applyPresetFilter(preset.filters, entries);
}
