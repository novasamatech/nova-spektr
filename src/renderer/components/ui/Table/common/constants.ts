import { Alignment } from './types';

export const HeightClass = {
  md: 'h-10',
  lg: 'h-15',
};

export const AlignmentClass: Record<Alignment, string> = {
  left: 'w-max mr-auto',
  right: 'w-max ml-auto',
  center: 'w-max mx-auto',
  width: 'w-full',
};
