import { createEvent, restore, combine } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Chain, Account, type HexString } from '@shared/core';
import { Transaction } from '@entities/transaction';
import { networkModel } from '@entities/network';

type Input = {
  chain: Chain;
  account: Account;
  signatory: Account | null;
  transaction: Transaction;
};

type Output = {
  signature: HexString;
  unsignedTx: UnsignedTransaction;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent<Output>();

const $signStore = restore<Input>(formInitiated, null);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $signStore,
  },
  ({ apis, store }) => {
    return store ? apis[store.chain.chainId] : null;
  },
);

export const signModel = {
  $signStore,
  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
