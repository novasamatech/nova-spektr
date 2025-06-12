import { type BN } from '@polkadot/util';
import { combine } from 'effector';

import { type Address, type Asset, type ChainId, type Validator } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';


export type BondNominateConfirm = TxConfirmInfo & {
  validators: Validator[];
  amount: string;
  destination: Address;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  asset: Asset;
};

const confirmStore = createTransactionConfirmStore<BondNominateConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
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

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};
