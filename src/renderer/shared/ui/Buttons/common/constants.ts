import { type Pallet, type Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  // TODO check if text button should have link style or action text style
  text_primary:
    'text-primary-button-background-default hover:text-primary-button-background-hover active:text-primary-button-background-active disabled:text-primary-button-background-inactive border-transparent bg-transparent px-2 py-1',
  text_error: '',
  text_secondary: '', // IDK if it's going to be a thing later, leave it here for now
  chip_primary:
    'text-tab-text-accent border border-primary-button-background-default bg-badge-background active:bg-badge-background-hover active:border-primary-button-background-hover hover:bg-badge-background-hover hover:border-primary-button-background-hover ',
  chip_secondary:
    'text-text-secondary border border-secondary-button-background hover:bg-hover active:bg-hover hover:border-secondary-button-background-hover active:border-secondary-button-background-active ',
  chip_error: '',
  fill_primary:
    'text-button-text border-0 bg-primary-button-background-default active:bg-bg-primary-button-background-inactive hover:bg-primary-button-background-hover disabled:bg-primary-button-background-inactive',
  fill_secondary:
    'text-text-primary bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active disabled:text-button-text-inactive disabled:bg-action-background-hover',
  fill_error:
    'bg-negative-action-background text-text-negative disabled:text-button-text-inactive disabled:bg-action-background-hover', // missing: disabled, active, hover
};

export const SizeClass = {
  sm: 'h-6.5 box-border rounded-[34px] text-button-small',
  md: 'h-10.5 box-border rounded-[34px] text-button-large',
};

export const Padding = {
  sm: 'px-3 py-1',
  md: 'px-4 py-3',
};
