import { createEvent, restore } from 'effector';
import { createGate } from 'effector-react';

import { type MultisigEvent, type MultisigTransaction } from '@/shared/core';

const flow = createGate<{ transactions: MultisigTransaction[]; events: MultisigEvent[] }>({
  defaultState: { transactions: [], events: [] },
});
const $multisigTransactions = flow.state.map(({ transactions }) => transactions);

const changeFilteredTxs = createEvent<MultisigTransaction[]>();
const $filteredTxs = restore<MultisigTransaction[]>(changeFilteredTxs, []).reset($multisigTransactions);

export const operationsModel = {
  $multisigTransactions,
  $multisigEvents: flow.state.map(({ events }) => events),

  $filteredTxs,

  events: {
    changeFilteredTxs,
  },

  gate: {
    flow,
  },
};
