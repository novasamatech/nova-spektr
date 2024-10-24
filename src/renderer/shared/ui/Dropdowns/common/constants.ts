import { cnTw } from '@/shared/lib/utils';

import { type Position, type Theme } from './types';

export const ViewClass: Record<Exclude<Position, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

export const OptionsContainerStyle =
  'mt-1 absolute z-20 py-1 px-1 max-h-60 w-full overflow-auto border rounded shadow-card-shadow';

export const ButtonTextFilledStyle = {
  light: 'text-inherit',
  dark: 'text-white',
};

export const ButtonTextEmptyStyle = {
  light: 'text-text-secondary',
  dark: 'text-text-tertiary',
};

export const OptionsContainerStyleTheme: Record<Theme, string> = {
  light: 'border-token-container-border bg-input-background',
  dark: 'border-border-dark bg-background-dark',
};

export const OptionStyle = 'p-2 rounded cursor-pointer';
export const OptionStyleTheme = {
  light: (active: boolean, selected: boolean) =>
    cnTw(
      'hover:bg-action-background-hover',
      active && 'bg-action-background-hover',
      selected && 'bg-selected-background',
    ),
  dark: (active: boolean, selected: boolean) =>
    cnTw(
      'hover:bg-background-item-hover',
      active && 'bg-background-item-hover',
      selected && 'bg-background-item-selected',
    ),
};

export const OptionTextStyle = {
  light: 'text-text-primary',
  dark: 'text-text-tertiary',
};

export const SelectButtonStyle = {
  light: {
    closed: 'border-filter-border',
    open: 'border-active-container-border',
    invalid: 'border-filter-border-negative',
    disabled: 'disabled:bg-input-background-disabled disabled:text-text-tertiary enabled:hover:shadow-card-shadow',
  },
  dark: {
    closed: 'border-border-dark',
    open: 'border-active-container-border',
    invalid: 'border-filter-border-negative',
    disabled: 'disabled:bg-input-background-disabled disabled:text-text-tertiary enabled:hover:shadow-card-shadow',
  },
};
