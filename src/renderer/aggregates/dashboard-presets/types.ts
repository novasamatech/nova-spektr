// src/renderer/aggregates/dashboard-presets/types.ts
export type PresetFilterCriteria = {
  sources: ('wallet' | 'local-contact' | 'backend-contact')[];
  entityNames: string[];
  categoryNames: string[];
  tags: { tagName: string; values: string[] }[];
};

export type AccountPreset = {
  id: string;
  name: string;
  filters: PresetFilterCriteria;
  lastActivatedAt: number;
};

export const EMPTY_FILTERS: PresetFilterCriteria = {
  sources: [],
  entityNames: [],
  categoryNames: [],
  tags: [],
};
