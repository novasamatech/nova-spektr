import { cnTw, tw } from '@/shared/lib/utils';

import { type Position, type Theme } from './types';

export const ViewClass: Record<Exclude<Position, 'auto'>, string> = {
  up: tw`bottom-full mb-2.5`,
  down: tw`top-full mt-2.5`,
};

export const OptionsContainerStyle = tw`absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-sm border px-1 py-1 shadow-card-shadow`;

export const ButtonTextFilledStyle = {
  light: 'text-inherit',
  dark: 'text-white',
};

export const ButtonTextEmptyStyle = {
  light: 'text-text-secondary',
  dark: 'text-text-tertiary',
};

export const OptionsContainerStyleTheme: Record<Theme, string> = {
  light: tw`border-token-container-border bg-input-background`,
  dark: tw`border-border-dark bg-background-dark`,
};

export const OptionStyle = tw`cursor-pointer rounded-sm p-2`;
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
    closed: tw`border border-filter-border`,
    open: tw`border border-active-container-border`,
    invalid: tw`border border-filter-border-negative`,
    disabled: tw`enabled:hover:shadow-card-shadow disabled:bg-input-background-disabled disabled:text-text-tertiary`,
  },
  dark: {
    closed: tw`border border-border-dark`,
    open: tw`border border-active-container-border`,
    invalid: tw`border border-filter-border-negative`,
    disabled: tw`enabled:hover:shadow-card-shadow disabled:bg-input-background-disabled disabled:text-text-tertiary`,
  },
};
