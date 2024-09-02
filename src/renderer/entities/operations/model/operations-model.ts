import { createGate } from 'effector-react';

import { type MultisigTransaction } from '@/shared/core';

const flow = createGate<{ txs: MultisigTransaction[] }>();

export const operationsModel = {
  $multisigTransactions: flow.state,

  gate: {
    flow,
  },
};
