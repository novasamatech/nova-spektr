import { cnTw, tw } from '@/shared/lib/utils';

import { type Pallet, type Variant } from './types';

export const ViewClass: Record<`${Variant}_${Pallet}`, (disabled: boolean) => string> = {
  text_primary: (disabled) =>
    cnTw('border-transparent bg-transparent px-2 py-1 text-primary-button-background-default', {
      'text-primary-button-background-inactive': disabled,
      'hover:text-primary-button-background-hover active:text-primary-button-background-active': !disabled,
    }),
  text_error: () => '',
  text_secondary: () => '',
  chip_primary: (disabled) =>
    cnTw('border border-primary-button-background-default bg-badge-background text-tab-text-accent', {
      'disabled:opacity-60': disabled,
      'hover:border-primary-button-background-hover hover:bg-badge-background-hover': !disabled,
      'active:border-primary-button-background-hover active:bg-badge-background-hover': !disabled,
    }),
  chip_secondary: (disabled) =>
    cnTw('border border-secondary-button-background text-text-secondary', {
      'disabled:opacity-60': disabled,
      'hover:border-secondary-button-background-hover hover:bg-hover': !disabled,
      'active:border-secondary-button-background-active active:bg-hover': !disabled,
    }),
  chip_error: () => '',
  fill_primary: (disabled) =>
    cnTw('border-0 bg-primary-button-background-default text-button-text', {
      'bg-primary-button-background-inactive': disabled,
      'active:bg-bg-primary-button-background-inactive hover:bg-primary-button-background-hover': !disabled,
    }),
  fill_secondary: (disabled) =>
    cnTw('bg-secondary-button-background text-text-primary', {
      'bg-action-background-hover text-button-text-inactive': disabled,
      'hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active': !disabled,
    }),
  fill_error: (disabled) =>
    cnTw('bg-negative-action-background text-text-negative', {
      'bg-action-background-hover text-button-text-inactive': disabled,
    }),
};

export const SizeClass = {
  sm: tw`box-border h-6.5 rounded-[34px] text-button-small`,
  md: tw`box-border h-10.5 rounded-[34px] text-button-large`,
};

export const Padding = {
  sm: tw`px-3 py-1`,
  md: tw`px-4 py-3`,
};
