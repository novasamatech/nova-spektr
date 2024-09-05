import { type PalletType } from './types';

export const getPalletName = (type: PalletType) => {
  if (type === 'governance') {
    return 'referenda';
  }

  return `${type}Referenda`;
};
