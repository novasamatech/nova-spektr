import { Variant } from './types';

export const ViewClass: Record<Exclude<Variant, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

const BaseWeightClass = {
  md: {
    placeholder: 'text-sm',
    height: 'h-12.5',
    option: 'h-10',
    arrows: 16,
  },
  lg: {
    placeholder: 'text-lg',
    height: 'h-15',
    option: 'h-12',
    arrows: 20,
  },
};

export const DropdownClass = {
  md: {
    ...BaseWeightClass.md,
    text: 'text-sm',
  },
  lg: {
    ...BaseWeightClass.lg,
    text: 'text-lg',
  },
};

export const SelectClass = {
  md: {
    ...BaseWeightClass.md,
    count: 'w-6.5 h-6.5',
    summary: 'test-sm',
  },
  lg: {
    ...BaseWeightClass.lg,
    count: 'w-6.5 h-6.5',
    summary: 'test-sm',
  },
};
