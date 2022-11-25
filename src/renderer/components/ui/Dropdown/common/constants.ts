import { Variant } from './types';

export const ViewClass: Record<Exclude<Variant, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};
