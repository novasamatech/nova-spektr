import { type ReferendumId } from './schema';
import { type PalletType } from './types';

export const getPalletName = (type: PalletType) => {
  if (type === 'governance') {
    return 'referenda';
  }

  return `${type}Referenda`;
};

export const toReferendumId = (value: number): ReferendumId => {
  return value as ReferendumId;
};
