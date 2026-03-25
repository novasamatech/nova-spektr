import { type ContactTag } from '@/shared/core/types/contact';

export type PresetFilterCriteria = {
  sources: ('wallet' | 'local-contact' | 'backend-contact')[];
  entityNames: string[];
  categoryNames: string[];
  tags: ContactTag[];
};

export type PresetType = 'filter' | 'custom';

export type AccountPreset = {
  id: string;
  name: string;
  type: PresetType;
  filters: PresetFilterCriteria;
  selectedIds: string[]; // used when type === 'custom'
};

export const EMPTY_FILTERS: PresetFilterCriteria = {
  sources: [],
  entityNames: [],
  categoryNames: [],
  tags: [],
};
