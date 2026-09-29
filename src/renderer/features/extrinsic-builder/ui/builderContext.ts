import { createContext, useContext } from 'react';

import { type Chain } from '@/shared/core';
import { type AmountUnit } from '../lib/amountUnit';

type BuilderContextValue = {
  /**
   * Chain the call is built for; nested call builders resolve their own unit
   * from it.
   */
  chain: Chain | null;
  /** Unit of the amount arguments of the closest enclosing call. */
  unit: AmountUnit | null;
};

export const BuilderContext = createContext<BuilderContextValue>({ chain: null, unit: null });

export const useBuilderContext = () => useContext(BuilderContext);
