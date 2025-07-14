import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';

import {
  type NoID,
  type PartialProxiedAccount,
  type ProxyGroup,
  ProxyVariant,
  type Timepoint,
  WalletType,
} from '@/shared/core';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type PathType, Paths } from '@/shared/routes';
import { subscriptionService } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type AddPureProxiedConfirm,
  addPureProxiedConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/AddPureProxied';
import { proxiesModel } from '@/features/proxies';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    initiator: formModel.form.fields.initiator.$value,
    wallets: walletModel.$wallets,
  },
  ({ initiator, wallets }) => {
    if (!initiator) return null;

    return walletUtils.getWalletById(wallets, initiator.walletId);
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
        data: [undefined, toAddress(accountId, { prefix: api.consts.system.ss58Prefix.toNumber() })],
      };

      const unsubscribe: UnsubscribePromise = subscriptionService.subscribeEvents(api, pureCreatedParams, (event) => {
        unsubscribe?.then((fn) => fn());

        resolve({
          accountId: pjsSchema.helpers.toAccountId(event.data[0].toHex()),
          blockNumber: timepoint.height,
          extrinsicIndex: timepoint.index,
        });
      });
    });
  },
);

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    activeWallet: walletSelect.$selectedWallet,
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
  source: {
    coreTx: formModel.$coreTx,
    multisigDeposit: formModel.$multisigDeposit,
    route: formModel.$route,
    fee: formModel.$fee,
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ coreTx, tx, chain }) => nonNullable(tx) && nonNullable(coreTx) && nonNullable(chain),
  fn: ({ coreTx, multisigDeposit, route, tx, chain }, { formData }) => {
    return {
      event: [
        {
          ...formData,
          signatory: formData.signatory!,
          multisigDeposit: multisigDeposit.toString(),
          fee: formData.fee,
          proxyDeposit: formData.proxyDeposit,
          chain,
          coreTx: coreTx!,
          route,
          tx: tx!,
        } satisfies AddPureProxiedConfirm,
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
    initiator: formModel.form.fields.initiator.$value,
    signatory: formModel.form.fields.signatory.$value,
  },
  filter: ({ tx, chain, initiator, signatory }) =>
    nonNullable(tx) && nonNullable(chain) && nonNullable(initiator) && nonNullable(signatory),
  fn: ({ tx, chain, initiator, signatory }) => ({
    event: {
      signingPayloads: [
        {
          chain,
          account: initiator,
          signatory,
          transaction: tx!,
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
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
    chain: formModel.form.fields.chain.$value,
    initiator: formModel.form.fields.initiator.$value,
    signatory: formModel.form.fields.signatory.$value,
  },
  filter: (proxyData) => {
    return (
      nonNullable(proxyData.tx) &&
      nonNullable(proxyData.coreTx) &&
      nonNullable(proxyData.chain) &&
      nonNullable(proxyData.initiator) &&
      nonNullable(proxyData.signatory)
    );
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.chain,
      account: proxyData.initiator,
      signatory: proxyData.signatory,
      wrappedTxs: [proxyData.tx!],
      coreTxs: [proxyData.coreTx!],
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
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ step, initiator, chain }) =>
    addPureProxiedUtils.isSubmitStep(step) && nonNullable(initiator) && nonNullable(chain),
  fn: ({ apis, initiator, chain }, submitData) => ({
    api: apis[chain.chainId],
    accountId: initiator.accountId,
    timepoint: (submitData[0].params as ExtrinsicResultParams).timepoint,
  }),
  target: getPureProxyFx,
});

sample({
  clock: getPureProxyFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ initiator, chain }, { accountId }) => [
    {
      accountId: initiator.accountId,
      proxiedAccountId: accountId,
      chainId: chain.chainId,
      proxyType: 'Any' as const,
      delay: 0,
    },
  ],
  target: proxyModel.events.proxiesAdded,
});

sample({
  clock: getPureProxyFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ chain, initiator }, { accountId, blockNumber, extrinsicIndex }) => {
    return [
      {
        accountId,
        chainId: chain.chainId,
        proxyAccountId: initiator.accountId,
        delay: 0,
        proxyType: 'Any',
        proxyVariant: ProxyVariant.PURE,
        blockNumber,
        extrinsicIndex,
      },
    ] as PartialProxiedAccount[];
  },
  target: proxiesModel.createProxiesWallets,
});

sample({
  clock: combineEvents({
    events: [getPureProxyFx.doneData, walletModel.events.walletCreatedDone],
    reset: flowStarted,
  }),
  source: {
    chain: formModel.form.fields.chain.$value,
    proxyGroups: proxyModel.$proxyGroups,
    proxyDeposit: formModel.$proxyDeposit,
  },
  filter: ({ chain }, [_, { wallet }]) => wallet.type === WalletType.PROXIED && nonNullable(chain),
  fn: ({ chain, proxyGroups, proxyDeposit }, [{ accountId }, { wallet }]) => {
    const newProxyGroup: NoID<ProxyGroup> = {
      walletId: wallet.id,
      chainId: chain.chainId,
      proxiedAccountId: accountId,
      totalDeposit: proxyDeposit,
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
    coreTx: formModel.$coreTx,
  },
  fn: ({ coreTx }) => {
    if (nullable(coreTx)) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
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
    activeWallet: walletSelect.$selectedWallet,
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
