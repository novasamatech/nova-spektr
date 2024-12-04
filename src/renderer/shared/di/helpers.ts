import { type AnyIdentifier } from './types';

export const isIdentifier = (v: unknown): v is AnyIdentifier => {
  return typeof v === 'object' && v !== null && '__BRAND' in v && v.__BRAND === 'Identifier';
};
