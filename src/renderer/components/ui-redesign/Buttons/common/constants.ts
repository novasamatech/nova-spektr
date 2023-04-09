import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-action-text-default hover:text-action-text border-transparent bg-transparent', // missing: disabled, active
  fill_primary: 'text-button-text border-0 bg-button-background-primary', // missing: hover, disabled, active
  outline_primary: 'text-action-text border border-filter-border', // missing: hover, disabled, active
};

export const WeightClass = {
  // xs: 'text-xs leading-3.5 font-semibold h-5 px-2 rounded-md',
  // sm: 'text-xs leading-3.5 font-semibold h-6 px-2 rounded-md',
  md: 'text-sm leading-3.5 font-semibold h-7.5 px-2 rounded',
  // lg: 'text-base leading-5 font-semibold h-10 px-3 rounded-2lg',
};
