import { Variant } from './types';

export const ViewClass: Record<Exclude<Variant, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

export const WeightClass = {
  md: {
    placeholder: 'text-sm',
    text: 'text-sm',
    height: 'h-12.5',
    option: 'h-10',
    arrows: 16,
  },
  lg: {
    placeholder: 'text-lg',
    text: 'text-lg',
    height: 'h-15',
    option: 'h-12',
    arrows: 20,
  },
};
