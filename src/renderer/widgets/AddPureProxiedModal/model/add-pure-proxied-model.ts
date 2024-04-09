import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';
import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import { Transaction, transactionService } from '@entities/transaction';
import { dictionary, toAddress } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import {
  type ProxyGroup,
  type NoID,
  ProxyType,
  AccountId,
  PartialProxiedAccount,
  ProxyVariant,
  Timepoint,
} from '@shared/core';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { proxiesModel } from '@features/proxies';
import { Step, AddPureProxiedStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { subscriptionService } from '@entities/chain';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddPureProxiedStore | null>(null).reset(flowFinished);

const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    store: $addProxyStore,
    accounts: walletModel.$accounts,
  },
  ({ wallet, store, accounts, wallets }) => {
    if (!wallet || !store?.chain || !store.account.id) return [];

    const walletFiltered = wallets.filter((wallet) => {
      return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
    });
    const walletsMap = dictionary(walletFiltered, 'id');
    const chainFilteredAccounts = accounts.filter((account) => {
      if (accountUtils.isBaseAccount(account) && walletUtils.isPolkadotVault(walletsMap[account.walletId])) {
        return false;
      }

      return accountUtils.isChainAndCryptoMatch(account, store.chain);
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account: store.account,
      accounts: chainFilteredAccounts,
      signatories: [],
    });
  },
);

type GetPureProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
  timepoint: Timepoint;
};
type GetPureProxyResult = {
  accountId: AccountId;
  blockNumber: number;
  extrinsicIndex: number;
};
const getPureProxyFx = createEffect(
  ({ api, accountId, timepoint }: GetPureProxyParams): Promise<GetPureProxyResult> => {
    return new Promise((resolve) => {
      const pureCreatedParams = {
        section: 'proxy',
        method: 'PureCreated',
        data: [undefined, toAddress(accountId, { prefix: api.registry.chainSS58 })],
      };

      let unsubscribe: UnsubscribePromise;
      unsubscribe = subscriptionService.subscribeEvents(api, pureCreatedParams, (event) => {
        unsubscribe?.then((fn) => fn());

        const accountId = event.data[0].toHex();

        resolve({
          accountId,
          blockNumber: timepoint.height,
          extrinsicIndex: timepoint.index,
        });
      });
    });
  },
);

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
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    addProxyStore: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    addProxyStore: $addProxyStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $addProxyStore,
  filter: (network: AddPureProxiedStore | null): network is AddPureProxiedStore => Boolean(network),
  fn: ({ chain }, { formData }) => ({
    event: { ...formData, chain },
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
    wrappedTx: $wrappedTx,
  },
  filter: ({ addProxyStore, wrappedTx }) => Boolean(addProxyStore) && Boolean(wrappedTx),
  fn: ({ addProxyStore, wrappedTx }) => ({
    event: {
      chain: addProxyStore!.chain,
      accounts: [addProxyStore!.account],
      signatory: addProxyStore!.signatory,
      transactions: [wrappedTx!],
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
    coreTx: $coreTx,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      description: proxyData.addProxyStore!.description,
      transactions: [proxyData.coreTx!],
      multisigTxs: proxyData.multisigTx ? [proxyData.multisigTx] : [],
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
    events: [getPureProxyFx.doneData, proxiesModel.output.walletsCreated],
    reset: flowStarted,
  }),
  source: {
    addProxyStore: $addProxyStore,
    proxyGroups: proxyModel.$proxyGroups,
  },
  filter: ({ addProxyStore }, [_, wallet]) => Boolean(wallet.wallets[0].id) && Boolean(addProxyStore),
  fn: ({ addProxyStore, proxyGroups }, [{ accountId }, wallet]) => {
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
  fn: ({ apis, params }, submitData) => ({
    api: apis[params!.chain.chainId],
    accountId: params!.account.accountId,
    timepoint: submitData.timepoint,
  }),
  target: getPureProxyFx,
});

sample({
  clock: getPureProxyFx.doneData,
  source: $addProxyStore,
  filter: (addPureProxiedStore: AddPureProxiedStore | null): addPureProxiedStore is AddPureProxiedStore =>
    Boolean(addPureProxiedStore),
  fn: (addPureProxiedStore, { accountId }) => [
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
  filter: (addProxyStore: AddPureProxiedStore | null): addProxyStore is AddPureProxiedStore => {
    return Boolean(addProxyStore);
  },
  fn: ({ chain, account }, { accountId, blockNumber, extrinsicIndex }) => {
    const proxiedAccount: PartialProxiedAccount = {
      accountId,
      chainId: chain.chainId,
      proxyAccountId: account.accountId,
      delay: 0,
      proxyType: ProxyType.ANY,
      proxyVariant: ProxyVariant.PURE,
      blockNumber,
      extrinsicIndex,
    };

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
