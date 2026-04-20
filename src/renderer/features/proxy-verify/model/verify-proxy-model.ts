import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample, split } from 'effector';
import { createGate } from 'effector-react';
import { and, not, spread } from 'patronum';

import { type Chain, type ChainId, type ProxyType, type Wallet } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { getNativeAsset, nonNullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type VerifyProxyConfirm,
  confirmModel,
} from '@/features/operations/OperationsConfirm/VerifyProxy/model/confirm-model';
import { verifyProxyValidator } from '@/features/operations/OperationsValidation';
import { VERIFIABLE_PROXY_TYPES, buildVerifyProxyCore } from '../lib/build-verify-proxy';

export enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type VerifyGuardFailure =
  | 'proxy_type_restricted'
  | 'delay_nonzero'
  | 'chain_missing'
  | 'chain_unsupported'
  | 'proxy_not_multisig';

/** Proxy row fields required for the verify flow. */
export type VerifyProxyRef = {
  id: string;
  chainId: ChainId;
  pureProxyAccountId: AccountId;
  proxyAccountId: AccountId;
  proxyType: ProxyType;
  delay: number;
};

export type VerifyFlowInput = {
  wallet: Wallet;
  proxy: VerifyProxyRef;
};

type VerifyStore = {
  wallet: Wallet;
  proxy: VerifyProxyRef;
  chain: Chain;
  initiator: AnyAccount;
};

type ResolveCtx = {
  chains: ReturnType<typeof networkModel.$chains.getState>;
  allAccounts: AnyAccount[];
};

type ResolveResult = { ok: true; store: VerifyStore } | { ok: false; reason: VerifyGuardFailure };

type FormParams = {
  signatory: AnyAccount | null;
};

function resolveVerifyStore({ chains, allAccounts }: ResolveCtx, input: VerifyFlowInput): ResolveResult {
  const { wallet, proxy } = input;

  if (!VERIFIABLE_PROXY_TYPES.has(proxy.proxyType)) return { ok: false, reason: 'proxy_type_restricted' };
  if (proxy.delay !== 0) return { ok: false, reason: 'delay_nonzero' };

  const chain = chains[proxy.chainId];
  if (!chain) return { ok: false, reason: 'chain_missing' };
  if (!networkUtils.isProxySupported(chain.options)) return { ok: false, reason: 'chain_unsupported' };

  const initiator =
    allAccounts.find((account) => {
      if (!accountUtils.isAnyMultisigAccount(account)) return false;

      if (accountUtils.isFlexibleMultisigAccount(account)) {
        return account.chainId === proxy.chainId && account.multisigAccountId === proxy.proxyAccountId;
      }

      return account.accountId === proxy.proxyAccountId;
    }) ?? null;

  if (!initiator || !accountUtils.isAnyMultisigAccount(initiator)) {
    return { ok: false, reason: 'proxy_not_multisig' };
  }

  return {
    ok: true,
    store: { wallet, proxy, chain, initiator },
  };
}

const flowStarted = createEvent<VerifyFlowInput>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);
const guardRejected = createEvent<{ input: VerifyFlowInput; reason: VerifyGuardFailure }>();
const wentBackFromConfirm = createEvent();

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $step = restore(stepChanged, Step.NONE);
const $verifyStore = createStore<VerifyStore | null>(null);

/** Proxy row id for the flow that opened verify (INIT step). */
const $activeProxyId = createStore<string | null>(null);

/** Confirm payload when the shared confirm list has not resolved wallets yet. */
const $confirmMeta = createStore<VerifyProxyConfirm | null>(null);
const $lastGuardFailure = restore(
  guardRejected.map(({ reason }) => reason),
  null,
).reset([flowStarted, flowFinished]);

const resolved = sample({
  clock: flowStarted,
  source: {
    chains: networkModel.$chains,
    allAccounts: accounts.$list,
  },
  fn: (ctx, input) => ({ input, result: resolveVerifyStore(ctx, input) }),
});

const resolveRejected = resolved.filterMap(({ input, result }) => {
  if (result.ok) return;
  return { input, reason: result.reason };
});

const resolveSucceeded = resolved.filterMap(({ result }) => {
  if (!result.ok) return;
  return result.store;
});

sample({
  clock: resolveRejected,
  target: guardRejected,
});

sample({
  clock: resolveSucceeded,
  target: $verifyStore,
});

sample({
  clock: resolved,
  filter: ({ result }) => result.ok,
  fn: ({ input }) => input.proxy.id,
  target: $activeProxyId,
});

sample({
  clock: resolved,
  filter: ({ result }) => !result.ok,
  fn: () => null,
  target: $verifyStore,
});

sample({
  clock: resolved,
  filter: ({ result }) => !result.ok,
  fn: () => null,
  target: $activeProxyId,
});

sample({
  clock: resolved,
  filter: ({ result }) => result.ok,
  fn: () => Step.INIT,
  target: stepChanged,
});

const $chainStore = $verifyStore.map((store) => store?.chain ?? null);
const $initiatorStore = $verifyStore.map((store) => store?.initiator ?? null);

const $signatories = createSignatoriesStore({
  initiator: $initiatorStore,
  chain: $chainStore,
  accounts: accounts.$list,
});

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            balances: balanceModel.$balanceMap,
            signatories: $signatories,
            chain: $chainStore,
          }),
          fn: (signatory, _f, { balances, chain, fee, multisigDeposit }) => {
            if (!signatory) {
              return { message: 'proxy.addProxy.noSignatoryError' };
            }

            if (!chain) {
              return { message: 'proxy.addProxy.noChainError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              chain.chainId,
              getNativeAsset(chain.assets).assetId,
            );

            const hasEnoughTokens = new BN(multisigDeposit)
              .add(new BN(fee))
              .lte(withdrawableAmountBN(signatoryBalance));

            if (!hasEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $coreTx = combine(
  {
    signatory: form.fields.signatory.$value,
    initiator: $initiatorStore,
    data: $verifyStore,
  },
  ({ signatory, initiator, data }) => {
    if (!signatory || !data || !initiator) return null;

    return buildVerifyProxyCore({
      chainId: data.chain.chainId,
      proxyAccountId: data.proxy.proxyAccountId,
      pureProxyAccountId: data.proxy.pureProxyAccountId,
      proxyType: data.proxy.proxyType,
    });
  },
);

const $api = combine({ store: $verifyStore, apis: networkModel.$apis }, ({ store, apis }) =>
  store ? (apis[store.chain.chainId] ?? null) : null,
);

const {
  $tx: $wrappedTx,
  $fee,
  $pendingFee,
  $route,
} = createComplexTxStore({
  api: $api,
  chain: $chainStore,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: $initiatorStore,
  signatory: form.fields.signatory.$value,
});

const $asset = $chainStore.map((chain) => (chain ? getNativeAsset(chain.assets) : null));

const { $errors, $valid } = createTxValidationStore({
  validator: verifyProxyValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $wrappedTx,
  },
});

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $isMultisig = $multisigDeposit.map((deposit) => deposit.gt(BN_ZERO));

const $canSubmit = and($valid, form.$isValid, not($pendingFee));

sample({
  clock: $signatories,
  source: form.fields.signatory.$value,
  filter: (current, signatories) => !current && signatories.length > 0,
  fn: (_current, signatories) => signatories[0]!,
  target: form.fields.signatory.change,
});

sample({
  clock: $step,
  source: {
    signatories: $signatories,
  },
  filter: ({ signatories }, step) => step === Step.INIT && signatories.length === 1,
  target: form.submit,
});

const confirmEvent = sample({
  clock: form.submit.doneData,
  source: {
    tx: $wrappedTx,
    coreTx: $coreTx,
    chain: $chainStore,
    initiator: $initiatorStore,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    verifyStore: $verifyStore,
    route: $route,
  },
  fn: (source, clock) => {
    return { ...source, ...clock };
  },
}).filterMap(({ tx, coreTx, chain, initiator, fee, multisigDeposit, verifyStore, route, signatory }) => {
  if (
    nonNullable(tx) &&
    nonNullable(chain) &&
    nonNullable(initiator) &&
    nonNullable(verifyStore) &&
    nonNullable(signatory) &&
    nonNullable(fee) &&
    nonNullable(coreTx)
  ) {
    return [
      {
        id: 0,
        initiator,
        signatory,
        route,
        chain,
        tx,
        coreTx,
        fee: fee.toString(),
        multisigDeposit: multisigDeposit.toString(),
        proxyType: verifyStore.proxy.proxyType,
        pureProxyAccountId: verifyStore.proxy.pureProxyAccountId,
        proxyAccountId: verifyStore.proxy.proxyAccountId,
      } satisfies VerifyProxyConfirm,
    ];
  }

  return null;
});

sample({
  clock: confirmEvent,
  filter: (items) => nonNullable(items) && items.length > 0,
  fn: (items) => items!,
  target: confirmModel.init,
});

sample({
  clock: confirmEvent,
  filter: (items) => nonNullable(items) && items.length > 0,
  fn: (items) => items![0]!,
  target: $confirmMeta,
});

sample({
  clock: confirmEvent,
  filter: (items) => nonNullable(items) && items.length > 0,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: confirmModel.startSigning,
  source: {
    verifyStore: $verifyStore,
    wrappedTx: $wrappedTx,
    signatory: form.fields.signatory.$value,
  },
  filter: ({ verifyStore, wrappedTx, signatory }) => {
    return nonNullable(verifyStore) && nonNullable(wrappedTx) && nonNullable(signatory);
  },
  fn: ({ verifyStore, signatory, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: verifyStore!.chain,
          account: verifyStore!.initiator,
          signatory: signatory!,
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
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, signatureResult) => ({
    event: signatureResult,
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.done,
  source: $verifyStore,
  filter: (store, results) => nonNullable(store) && submitUtils.isSuccessResult(results[0]!.result),
  target: flowFinished,
});

split({
  clock: wentBackFromConfirm,
  source: combine({
    isMultisig: $isMultisig,
    signatories: $signatories,
  }),
  match: {
    multisigWallet: ({ isMultisig, signatories }) => isMultisig && signatories.length !== 1,
  },
  cases: {
    multisigWallet: stepChangedToInit,
    __: flowFinished,
  },
});

sample({
  clock: stepChangedToInit,
  target: confirmModel.resetConfirm,
});

sample({
  clock: stepChangedToInit,
  fn: () => null,
  target: $confirmMeta,
});

sample({
  clock: flowStarted,
  target: confirmModel.resetConfirm,
});

sample({
  clock: flowStarted,
  fn: () => null,
  target: $confirmMeta,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  target: confirmModel.resetConfirm,
});

sample({
  clock: flowFinished,
  fn: () => null,
  target: $verifyStore,
});

sample({
  clock: flowFinished,
  fn: () => null,
  target: $activeProxyId,
});

sample({
  clock: flowFinished,
  fn: () => null,
  target: $confirmMeta,
});

sample({
  clock: flowFinished,
  target: form.reset,
});

export const verifyProxyModel = {
  flow,

  $step,
  $activeProxyId,
  $confirmMeta,
  $verifyStore,
  $coreTx,
  $wrappedTx,
  $fee,
  $pendingFee,
  $multisigDeposit,
  $signatories,
  $errors,
  $canSubmit,
  $lastGuardFailure,

  form,

  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
    guardRejected,
    wentBackFromConfirm,
  },

  __test: { resolveVerifyStore },
};

export { VERIFIABLE_PROXY_TYPES };
