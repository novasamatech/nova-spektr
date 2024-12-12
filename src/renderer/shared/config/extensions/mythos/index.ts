import { type Extension, type TxWrapper } from '../types';

import { types } from './types';

export const MYTHOS_PROVIDER: Extension = {
  types,
};

export const MYTHOS_TXWRAPPER: TxWrapper = {
  additionalTypes: types,
};
