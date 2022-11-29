import { Variant } from './types';

export const ViewClass: Record<Exclude<Variant, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

export const WeightClass = {
  md: {
    placeholder: 'text-sm',
    count: 'w-6.5 h-6.5',
    summary: 'test-sm',
    height: 'h-12.5',
    option: 'h-10',
    arrows: 16,
  },
  lg: {
    placeholder: 'text-lg',
    count: 'w-8.5 h-8.5',
    summary: 'text-lg',
    height: 'h-15',
    option: 'h-12',
    arrows: 20,
  },
};
