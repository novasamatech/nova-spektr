import { DropdownOption, DropdownResult } from '@shared/ui/types';

export type FilterName = 'status' | 'network' | 'type';

export type FiltersOptions = Record<FilterName, Set<DropdownOption>>;
export type SelectedFilters = Record<FilterName, DropdownResult[]>;
