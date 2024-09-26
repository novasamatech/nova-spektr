import { createGate } from 'effector-react';

import { type MultisigEvent, type MultisigTransaction } from '@/shared/core';

const flow = createGate<{ transactions: MultisigTransaction[]; events: MultisigEvent[] }>({
  defaultState: { transactions: [], events: [] },
});

export const operationsModel = {
  $multisigTransactions: flow.state.map(({ transactions }) => transactions),
  $multisigEvents: flow.state.map(({ events }) => events),

  gate: {
    flow,
  },
};
