import { createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';
import { Event } from '@polkadot/types/interfaces';
import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { walletModel, walletUtils } from '@entities/wallet';
import {
  type MultisigAccount,
  type ProxyGroup,
  type NoID,
  ProxyType,
  AccountId,
  PartialProxiedAccount,
  ProxyVariant,
} from '@shared/core';
import { wrapAsMulti, wrapAsProxy } from '@entities/transaction/lib/extrinsicService';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { Step, TxWrappers, AddPureProxiedStore } from '../lib/types';
import { addPureProxiedUtils } from '../lib/add-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';
import { subscriptionService } from '@entities/chain';
import { proxiesModel } from '@features/proxies';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddPureProxiedStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

type GetPureProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
};
const getPureProxyFx = createEffect(({ api, accountId }: GetPureProxyParams): Promise<AccountId> => {
  return new Promise((resolve) => {
    const pureCreatedParams = {
      section: 'proxy',
      method: 'PureCreated',
      data: [undefined, toAddress(accountId, { prefix: api.registry.chainSS58 })],
    };

    let unsubscribe: UnsubscribePromise | undefined;

    unsubscribe = subscriptionService.subscribeEvents(api, pureCreatedParams, (event: Event) => {
      unsubscribe?.then((fn) => {
        fn();
      });

      resolve(event.data[0].toHex());
    });
  });
});

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: walletSelectModel.$walletForDetails,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToSubSet,
});

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  target: $addProxyStore,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  fn: ({ wallet, wallets }, { account }): TxWrappers => {
    if (!wallet) return [];
    if (walletUtils.isMultisig(wallet)) return ['multisig'];
    if (!walletUtils.isProxied(wallet)) return [];

    const accountWallet = walletUtils.getWalletById(wallets, account.walletId);

    return walletUtils.isMultisig(accountWallet) ? ['multisig', 'proxy'] : ['proxy'];
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
  },
  fn: ({ txWrappers, apis }, formData) => {
    const { chain, account, signatory } = formData;

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: ProxyType.ANY, delay: 0, index: 0 },
    };

    return txWrappers.reduce<{ transaction: Transaction; multisigTx: Transaction | null }>(
      (acc, wrapper) => {
        if (addPureProxiedUtils.hasMultisig([wrapper])) {
          acc.transaction = wrapAsMulti(
            apis[chain.chainId],
            acc.transaction,
            account as MultisigAccount,
            signatory!.accountId,
            chain.addressPrefix,
          );
          acc.multisigTx = acc.transaction;
        }
        if (addPureProxiedUtils.hasProxy([wrapper])) {
          acc.transaction = wrapAsProxy(apis[chain.chainId], acc.transaction, chain.addressPrefix);
        }

        return acc;
      },
      { transaction, multisigTx: null },
    );
  },
  target: spread({
    transaction: $transaction,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $transaction,
  filter: (transaction: Transaction | null): transaction is Transaction => Boolean(transaction),
  fn: (transaction, formData) => ({
    event: { ...formData, transaction },
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    addProxyStore: $addProxyStore,
    transaction: $transaction,
  },
  filter: ({ addProxyStore, transaction }) => Boolean(addProxyStore) && Boolean(transaction),
  fn: ({ addProxyStore, transaction }) => ({
    event: {
      chain: addProxyStore!.chain,
      account: addProxyStore!.account,
      signatory: addProxyStore!.signatory,
      transaction: transaction!,
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    addProxyStore: $addProxyStore,
    transaction: $transaction,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !addPureProxiedUtils.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.transaction) && isMultisigRequired;
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      description: proxyData.addProxyStore!.description,
      transaction: proxyData.transaction!,
      multisigTx: proxyData.multisigTx!,
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: combineEvents({
    events: [getPureProxyFx.doneData, proxiesModel.output.proxiedWalletsCreationFinished],
    reset: flowStarted,
  }),
  source: {
    addProxyStore: $addProxyStore,
    proxyGroups: proxyModel.$proxyGroups,
  },
  filter: ({ addProxyStore }, [accountId, wallet]) => Boolean(wallet.wallets[0].id) && Boolean(addProxyStore),
  fn: ({ addProxyStore, proxyGroups }, [accountId, wallet]) => {
    const newProxyGroup: NoID<ProxyGroup> = {
      walletId: wallet.wallets[0].id,
      chainId: addProxyStore!.chain.chainId,
      proxiedAccountId: accountId,
      totalDeposit: addProxyStore!.proxyDeposit,
    };

    const proxyGroupExists = proxyGroups.some((group) => proxyUtils.isSameProxyGroup(group, newProxyGroup));

    return proxyGroupExists ? { groupsUpdated: [newProxyGroup] } : { groupsAdded: [newProxyGroup] };
  },
  target: spread({
    groupsAdded: proxyModel.events.proxyGroupsAdded,
    groupsUpdated: proxyModel.events.proxyGroupsUpdated,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    apis: networkModel.$apis,
    params: $addProxyStore,
  },
  filter: ({ params }) => Boolean(params),
  fn: ({ apis, params }) => ({
    api: apis[params!.chain.chainId],
    accountId: params!.account.accountId,
  }),
  target: getPureProxyFx,
});

sample({
  clock: getPureProxyFx.doneData,
  source: $addProxyStore,
  filter: (addPureProxiedStore: AddPureProxiedStore | null): addPureProxiedStore is AddPureProxiedStore =>
    Boolean(addPureProxiedStore),
  fn: (addPureProxiedStore, accountId) => [
    {
      accountId: addPureProxiedStore.account.accountId,
      proxiedAccountId: accountId,
      chainId: addPureProxiedStore.chain.chainId,
      proxyType: ProxyType.ANY,
      delay: 0,
    },
  ],
  target: proxyModel.events.proxiesAdded,
});

sample({
  clock: getPureProxyFx.doneData,
  source: $addProxyStore,
  filter: (addPureProxiedStore: AddPureProxiedStore | null): addPureProxiedStore is AddPureProxiedStore => {
    return Boolean(addPureProxiedStore);
  },
  fn: ({ chain, account }, accountId) => {
    const proxiedAccount = {
      accountId,
      chainId: chain.chainId,
      proxyAccountId: account.accountId,
      delay: 0,
      proxyType: ProxyType.ANY,
      proxyVariant: ProxyVariant.PURE,
    } as PartialProxiedAccount;

    return {
      proxiedAccounts: [proxiedAccount],
      chains: { [chain.chainId]: chain },
    };
  },
  target: proxiesModel.events.proxiedWalletsCreated,
});

sample({
  clock: delay(getPureProxyFx.doneData, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: walletSelectModel.$walletForDetails,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToUnsubSet,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addPureProxiedModel = {
  $step,
  $chain: $addProxyStore.map((store) => store?.chain, { skipVoid: false }),
  events: {
    flowStarted,
    stepChanged,
  },
  outputs: {
    flowFinished,
  },
};
