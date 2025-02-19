import { createEvent, restore } from 'effector';

import { type DropdownOption, type DropdownResult } from '@/shared/ui/Dropdowns/common/types';

export type FilterName = 'status' | 'network' | 'type';

export type FiltersOptions = Record<FilterName, Set<DropdownOption>>;
export type SelectedFilters = Record<FilterName, DropdownResult[]>;

const EmptySelectedFilters: SelectedFilters = {
  status: [],
  network: [],
  type: [],
};

const selectedOptionsChanged = createEvent<SelectedFilters>();

const $selectedOptions = restore(selectedOptionsChanged, EmptySelectedFilters);

export const filter = {
  $selectedOptions,

  selectedOptionsChanged,
  selectedOptionsReset: $selectedOptions.reinit,
};
