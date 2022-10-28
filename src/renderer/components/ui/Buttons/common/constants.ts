import { Pallet, Variant } from './types';

export const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-primary border-transparent bg-transparent',
  text_secondary: 'text-secondary border-transparent bg-transparent',
  text_error: 'text-error border-transparent bg-transparent',
  text_shade: 'text-shade-40 border-transparent bg-transparent',
  text_alert: 'text-alert border-transparent bg-transparent',
  text_dark: 'text-neutral border-transparent bg-transparent',
  fill_primary: 'text-white border-primary bg-primary',
  fill_secondary: 'text-white border-secondary bg-secondary',
  fill_error: 'text-white border-error bg-error',
  fill_shade: 'text-shade-40 border-shade-20 bg-shade-20',
  fill_alert: 'text-white border-alert bg-alert',
  fill_dark: 'text-white border-neutral bg-neutral',
  outline_primary: 'text-primary border-current',
  outline_secondary: 'text-secondary border-current',
  outline_error: 'text-error border-current',
  outline_shade: 'text-shade-40 border-shade-20',
  outline_alert: 'text-alert border-alert',
  outline_dark: 'text-neutral border-neutral',
};

export const WeightClass = {
  xs: 'text-xs leading-3.5 font-semibold h-5 px-2 rounded-md',
  sm: 'text-xs leading-3.5 font-semibold h-6 px-2 rounded-md',
  md: 'text-sm leading-3.5 font-semibold h-7.5 px-2 rounded-lg',
  lg: 'text-base leading-5 font-semibold h-10 px-3 rounded-2lg',
};
