import { type TFunction } from 'i18next';

import { type Asset } from '@/shared/core';
import { nonNullable } from '@shared/lib/utils';

import { treasurySpendsDescription } from './constants';

export const getTreasuryTrackDescription = (asset: Asset | null, description: string, t: TFunction) => {
  if (nonNullable(asset) && treasurySpendsDescription[description]?.[asset.symbol]) {
    return t(description, { value: treasurySpendsDescription[description][asset.symbol], asset: asset.symbol });
  }

  return t(`${description}General`);
};
