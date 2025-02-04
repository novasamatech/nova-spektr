import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { type Chain, type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createTxStore } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { multisigUtils } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';

import { operationsContextModel } from './context';

type GetMultisigType = {
  signerAccountId: AccountId;
  chain: Chain;
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
};

const flow = createGate<{ chain: Chain | null; signer: AnyAccount | null }>({
  defaultState: { chain: null, signer: null },
});

const getMultisigTx = createEvent<GetMultisigType>();

const $transaction = createStore<Transaction | null>(null).reset(flow.open);
const $chain = flow.state.map(({ chain }) => chain);
const $signer = flow.state.map(({ signer }) => signer);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $transferTx = combine(
  {
    account: operationsContextModel.$account,
    chain: $chain,
    signer: $signer,
  },
  ({ account, signer, chain }) => {
    if (nullable(account) || !accountUtils.isFlexibleMultisigAccount(account) || nullable(chain) || nullable(signer)) {
      return null;
    }

    return transactionBuilder.buildTransfer({
      chain,
      asset: chain.assets.at(0)!,
      accountId: account!.accountId,
      destination: signer.accountId,
      transferAll: true,
      amount: '0',
    });
  },
);

const { $wrappedTx } = createTxStore({
  $api,
  $chain,
  $activeWallet: walletModel.$activeWallet,
  $wallets: walletModel.$wallets,
  $signatory: $signer,
  $account: operationsContextModel.$account,
  $coreTx: $transferTx,
});

sample({
  clock: getMultisigTx,
  source: {
    account: operationsContextModel.$account,
    wrappedTx: $wrappedTx,
  },
  filter: ({ account }) => nonNullable(account),
  fn: ({ account, wrappedTx }, { signerAccountId, chain, tx }) => {
    const otherSignatories = multisigUtils.getOtherSignatories(account!, signerAccountId, chain.addressPrefix);

    if (accountUtils.isFlexibleMultisigAccount(account!) && wrappedTx) {
      return transactionBuilder.buildRejectFlexibleMultisigTx({
        chain,
        signerAccountId,
        threshold: account!.threshold,
        accountId: account!.accountId,
        transaction: wrappedTx.wrappedTx,
        otherSignatories,
        tx,
      });
    }

    return transactionBuilder.buildRejectMultisigTx({
      chain,
      signerAccountId,
      threshold: account!.threshold,
      otherSignatories,
      tx,
    });
  },
  target: $transaction,
});

export const rejectModel = {
  flow,
  $transaction,
  $wrappedTx,

  events: {
    getMultisigTx,
  },
};
