import { type EventCallable, type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Account, type Chain, type ID, type ProxyAccount, TransactionType, type Wallet } from '@shared/core';
import { toAddress } from '@shared/lib/utils';
import { type WrappedTransactions } from '@entities/transaction';
import { walletUtils } from '@entities/wallet';
import { type SigningPayload } from '@/features/operations/OperationSign';

export type ConfirmInfo = {
  id?: number;
  account: Account;
  signatory?: Account;
  proxiedAccount?: ProxyAccount;
  description: string;
  chain: Chain;
  wrappedTransactions: WrappedTransactions;
};

export type ConfirmItem<Input extends ConfirmInfo = ConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator?: Wallet;
    proxied?: Wallet;
    signer?: Wallet;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
  signRequest: EventCallable<{ signingPayloads: SigningPayload[] }>;
};

export const createTransactionConfirmStore = <Input extends ConfirmInfo>({ $wallets, signRequest }: Params) => {
  type ConfirmMap = Record<ID, ConfirmItem<Input>>;

  const sign = createEvent<{ id: ID }>();
  const fillConfirm = createEvent<Input[]>();
  const addConfirms = createEvent<Input>();
  const replaceConfirm = createEvent<Input>();
  const $store = createStore<Input[]>([]);

  const $confirmMap = combine($store, $wallets, (store, wallets) => {
    if (!wallets.length) return {};

    return store.reduce<ConfirmMap>((acc, meta, index) => {
      const { wrappedTransactions, chain } = meta;
      const { wrappedTx, coreTx } = wrappedTransactions;
      const { addressPrefix } = chain;

      const initiatorWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => coreTx.address === toAddress(account.accountId, { prefix: addressPrefix }),
      });

      if (!initiatorWallet) {
        return acc;
      }

      const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => wrappedTx?.address === toAddress(account.accountId, { prefix: addressPrefix }),
      });

      const proxiedWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => {
          return (
            wrappedTx.type === TransactionType.PROXY &&
            wrappedTx.args.transaction.address === toAddress(account.accountId, { prefix: addressPrefix })
          );
        },
      });

      acc[meta.id ?? index] = {
        meta,
        wallets: {
          signer: signerWallet,
          initiator: initiatorWallet,
          proxied: proxiedWallet,
        },
      };

      return acc;
    }, {});
  });

  sample({
    clock: sign,
    source: { confirms: $confirmMap },
    filter: ({ confirms }, { id }) => id in confirms,
    fn: ({ confirms }, { id }): { signingPayloads: SigningPayload[] } => {
      const confirm = confirms[id];
      if (!confirm) {
        return { signingPayloads: [] };
      }

      const { meta } = confirm;

      return {
        signingPayloads: [
          {
            account: meta.account,
            chain: meta.chain,
            transaction: meta.wrappedTransactions.wrappedTx,
            signatory: meta.signatory,
          },
        ],
      };
    },
    target: signRequest,
  });

  sample({
    clock: fillConfirm,
    target: $store,
  });

  sample({
    clock: addConfirms,
    source: $store,
    fn: (store, input) => [...store, input],
    target: $store,
  });

  sample({
    clock: replaceConfirm,
    fn: (input) => [input],
    target: $store,
  });

  return {
    $confirmMap,
    sign,
    fillConfirm,
    addConfirms,
    replaceConfirm,
  };
};
