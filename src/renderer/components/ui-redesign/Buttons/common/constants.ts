import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-action-text-default hover:text-action-text border-transparent bg-transparent', // missing: disabled, active
  fill_primary: 'text-button-text border-0 bg-button-background-primary disabled:bg-primary-button-background-inactive',
  text_secondary: '', // IDK if it's going to be a thing later, leave it here for now
  fill_secondary:
    'text-text-primary bg-action-background-hover hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active disabled:text-button-text-inactive disabled:bg-action-background-hover',
};

export const SizeClass = {
  big: 'h-8 rounded-[34px] px-4 pb-2 pt-1.5 text-body',
  small: 'h-6 rounded-[34px] px-3 py-1 text-footnote',
};
