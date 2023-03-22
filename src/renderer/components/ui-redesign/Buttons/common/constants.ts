import { Pallet, Variant } from './types';

// TODO add action state styles e.g. active, disabled
export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primaryNew: 'text-primaryNew border-transparent bg-transparent',
  fill_primaryNew: 'text-white border-0 bg-primaryNew disabled:bg-primaryNew/[.48]',
  outline_primaryNew: 'text-primaryNew border border-gray-border disabled:border-primaryNew/[.48]',
};

export const WeightClass = {
  // xs: 'text-xs leading-3.5 font-semibold h-5 px-2 rounded-md',
  // sm: 'text-xs leading-3.5 font-semibold h-6 px-2 rounded-md',
  md: 'text-sm leading-3.5 font-semibold h-7.5 px-2 rounded',
  // lg: 'text-base leading-5 font-semibold h-10 px-3 rounded-2lg',
};
