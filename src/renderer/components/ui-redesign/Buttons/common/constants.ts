import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  // TODO check if text button should have link style or action text style
  text_primary: 'text-action-text-default hover:text-action-text border-transparent bg-transparent px-2 py-1',
  text_error: '',
  text_secondary: '', // IDK if it's going to be a thing later, leave it here for now
  fill_primary:
    'text-button-text border-0 bg-primary-button-background-default active:bg-bg-primary-button-background-inactive hover:bg-bg-primary-button-background-hover disabled:bg-primary-button-background-inactive',
  fill_secondary:
    'text-text-primary bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active disabled:text-button-text-inactive disabled:bg-action-background-hover',
  fill_error: 'bg-negative-action-background text-text-negative', // missing: disabled, active, hover
};

export const SizeClass = {
  sm: 'h-6.5 rounded-[34px] text-button-small font-semibold',
  md: 'h-10.5 rounded-[34px] text-button-large font-semibold',
};

export const Padding = {
  sm: 'px-3 py-1',
  md: 'px-4 py-3',
};
