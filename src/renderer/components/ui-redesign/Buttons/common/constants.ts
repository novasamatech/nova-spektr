import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-redesign-primary border-transparent bg-transparent',
  fill_primary: 'text-white border-0 bg-redesign-primary disabled:bg-redesign-primary/[.48]',
  outline_primary: 'text-redesign-primary border border-redesign-shade-8 disabled:border-redesign-primary/[.48]',
};

export const WeightClass = {
  // xs: 'text-xs leading-3.5 font-semibold h-5 px-2 rounded-md',
  // sm: 'text-xs leading-3.5 font-semibold h-6 px-2 rounded-md',
  md: 'text-sm leading-3.5 font-semibold h-7.5 px-2 rounded',
  // lg: 'text-base leading-5 font-semibold h-10 px-3 rounded-2lg',
};
