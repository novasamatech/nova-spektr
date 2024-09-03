import { type PalletType } from './types';

export const getPalletName = (type: PalletType) => {
  return `${type}Collective`;
};
