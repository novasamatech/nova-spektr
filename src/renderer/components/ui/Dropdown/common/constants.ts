import { Variant } from './types';

export const ViewClass: Record<Exclude<Variant, 'auto'>, string> = {
  up: 'bottom-10.5 mb-2.5',
  down: 'top-10.5 mt-2.5',
};
