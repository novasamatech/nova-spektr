import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';

import {
  type Account,
  type AccountId,
  type BasketTransaction,
  type NoID,
  type PartialProxiedAccount,
  type ProxyGroup,
  ProxyVariant,
  type Timepoint,
  type Transaction,
  WalletType,
} from '@/shared/core';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { subscriptionService } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { type ExtrinsicResultParams, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { addPureProxiedConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm/AddPureProxied';
import { proxiesModel } from '@/features/proxies';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { type AddPureProxiedStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddPureProxiedStore | null>(null).reset(flowFinished);

const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $selectedSignatories = createStore<Account[]>([]);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    store: $addProxyStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, store, wallets, signatories }) => {
    if (!wallet || !store?.chain || !store.account.id) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, store.chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: store.account,
      signatories,
    });
  },
);

const $initiatorWallet = combine(
  {
    store: $addProxyStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
  { skipVoid: false },
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

      const unsubscribe: UnsubscribePromise = subscriptionService.subscribeEvents(api, pureCreatedParams, (event) => {
        unsubscribe?.then((fn) => fn());

        resolve({
          accountId: event.data[0].toHex(),
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
    walletDetails: formModel.$wallet,
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
  filter: ({ formData }) => Boolean(formData.signatory),
  fn: ({ formData }) => [formData.signatory!],
  target: $selectedSignatories,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    store: $addProxyStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { addProxyStore: $addProxyStore, coreTx: $coreTx },
  filter: ({ addProxyStore }) => Boolean(addProxyStore),
  fn: ({ addProxyStore, coreTx }, { formData }) => ({
    event: [{ ...formData, chain: addProxyStore!.chain, coreTx }],
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
      signingPayloads: [
        {
          chain: addProxyStore!.chain,
          account: addProxyStore!.account,
          signatory: addProxyStore!.signatory,
          transaction: wrappedTx!,
        },
      ],
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
    wrappedTx: $wrappedTx,
    coreTx: $coreTx,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.wrappedTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      wrappedTxs: [proxyData.wrappedTx!],
      coreTxs: [proxyData.coreTx!],
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
  clock: submitModel.output.formSubmitted,
  source: {
    step: $step,
    apis: networkModel.$apis,
    params: $addProxyStore,
  },
  filter: ({ step, params }) => addPureProxiedUtils.isSubmitStep(step) && Boolean(params),
  fn: ({ apis, params }, submitData) => ({
    api: apis[params!.chain.chainId],
    accountId: params!.account.accountId,
    timepoint: (submitData[0].params as ExtrinsicResultParams).timepoint,
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
      proxyType: 'Any' as const,
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
      proxyType: 'Any',
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
  clock: combineEvents({
    events: [getPureProxyFx.doneData, walletModel.events.walletCreatedDone],
    reset: flowStarted,
  }),
  source: {
    addProxyStore: $addProxyStore,
    proxyGroups: proxyModel.$proxyGroups,
  },
  filter: ({ addProxyStore }, [_, { wallet }]) => wallet.type === WalletType.PROXIED && nonNullable(addProxyStore),
  fn: ({ addProxyStore, proxyGroups }, [{ accountId }, { wallet }]) => {
    const newProxyGroup: NoID<ProxyGroup> = {
      walletId: wallet.id,
      chainId: addProxyStore!.chain.chainId,
      proxiedAccountId: accountId,
      totalDeposit: addProxyStore!.proxyDeposit,
    };

    const existingProxyGroup = proxyGroups.find((group) => proxyUtils.isSameProxyGroup(group, newProxyGroup));

    return existingProxyGroup
      ? { toUpdate: [{ id: existingProxyGroup.id, ...newProxyGroup }] }
      : { toAdd: [newProxyGroup] };
  },
  target: spread({
    toAdd: proxyModel.events.proxyGroupsAdded,
    toUpdate: proxyModel.events.proxyGroupsUpdated,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    store: $addProxyStore,
    coreTx: $coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return Boolean(store) && Boolean(coreTx) && Boolean(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    const tx = {
      initiatorWallet: store!.account.walletId,
      coreTx,
      txWrappers,
    } as BasketTransaction;

    return [tx];
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

sample({
  clock: delay(getPureProxyFx.doneData, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: formModel.$wallet,
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
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
