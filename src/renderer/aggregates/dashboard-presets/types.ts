import { type ContactTag } from '@/shared/core/types/contact';

export type PresetFilterCriteria = {
  sources: ('wallet' | 'local-contact' | 'backend-contact')[];
  entityNames: string[];
  categoryNames: string[];
  tags: ContactTag[];
};

export type AccountPreset = {
  id: string;
  name: string;
  filters: PresetFilterCriteria;
};

export const EMPTY_FILTERS: PresetFilterCriteria = {
  sources: [],
  entityNames: [],
  categoryNames: [],
  tags: [],
};
