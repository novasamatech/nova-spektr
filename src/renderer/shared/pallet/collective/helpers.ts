import { capitalize } from 'lodash';

import { type PalletType } from './types';

export const getPalletName = (type: PalletType) => {
  return `${capitalize(type)}Collective` as const;
};
