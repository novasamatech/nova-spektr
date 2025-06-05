import { type BN } from '@polkadot/util';
import { combine, createEvent } from 'effector';

import { type Address, type Asset, type ChainId, type Validator } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';

export type Confirm = TxConfirmInfo & {
  validators: Validator[];
  amount: string;
  destination: Address;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  asset: Asset;
};

const formSubmitted = createEvent();

const confirmStore = createTransactionConfirmStore<Confirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

const $eraLength = combine(networkModel.$apis, (apis) => {
  if (!apis) return {};

  return Object.entries(apis).reduce<Record<ChainId, number>>(
    (acc, [chainId, api]) => ({
      ...acc,
      [chainId as ChainId]: (api.consts.staking.sessionsPerEra as unknown as BN).toNumber(),
    }),
    {},
  );
});

export const confirmModel = {
  $confirms: confirmStore.$confirms,
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $eraLength,
  $apis: networkModel.$apis,
  events: {
    formInitiated: confirmStore.fillConfirm,
  },
  output: {
    formSubmitted,
  },
};
