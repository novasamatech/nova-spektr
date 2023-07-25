import { Position, Theme } from './types';

export const ViewClass: Record<Exclude<Position, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

export const OptionsContainerStyle =
  'mt-1 absolute z-20 py-1 px-1 max-h-60 w-full overflow-auto border rounded shadow-card-shadow';

export const OptionsContainerStyleTheme: Record<Theme, string> = {
  light: 'border-token-container-border bg-input-background',
  dark: 'border-border-dark bg-background-dark',
};

export const OptionStyle = 'p-2 rounded cursor-pointer hover:bg-action-background-hover';

export const SelectButtonStyle = {
  closed: 'border-filter-border',
  open: 'border-active-container-border',
  invalid: 'border-filter-border-negative',
  disabled: 'disabled:bg-input-background-disabled disabled:text-text-tertiary enabled:hover:shadow-card-shadow',
};
