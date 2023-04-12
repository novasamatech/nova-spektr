import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-action-text-default hover:text-action-text border-transparent bg-transparent', // missing: disabled, active
  fill_primary:
    'text-button-text border-0 bg-button-background-primary hover:bg-primary-button-background-hover active:bg-primary-button-background-active disabled:bg-primary-button-background-inactive',
  text_secondary: '', // idk if its gonna be a thing later, leave it here for now
  fill_secondary:
    'text-text-primary bg-action-background-hover hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active disabled:text-button-text-inactive disabled:bg-action-background-hover',
};

export const SizeClass = {
  big: '',
  small: '',
};
