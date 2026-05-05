import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset, type Chain, type Conviction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { accounts } from '@/domains/network';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { getLocksForAccount, networkSelectorModel } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { graphModel } from '@/features/signing-path';
import { type DelegateData, type WalletData } from '../lib/types';

export const flowFinished = createEvent();

export const $target = createStore<DelegateAccount | null>(null).reset(flowFinished);
export const $tracks = createStore<number[]>([]).reset(flowFinished);

export const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'initiator'> | null>(null).reset(
  flowFinished,
);

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
  conviction: Conviction;
  locks: Record<string, BN>;
};

const formInitiated = createEvent<WalletData & { shards: AnyAccount[] }>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (initiator, fields, { fee, isProxy, proxyBalance, network, initiatorBalance }) => {
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy) {
              if (new BN(fee).gt(new BN(proxyBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            } else if (fields.amount) {
              const amountBN = new BN(formatAmount(fields.amount, network.asset.precision));
              if (amountBN.gt(new BN(initiatorBalance))) {
                return { message: 'staking.bond.noBondBalanceError' };
              }
            }
          },
        };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            multisigDeposit: $multisigDeposit,
            fee: $fee,
            hasAnyMultisig: $hasAnyMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _fields, { multisigDeposit, fee, hasAnyMultisig, signatoryBalance }) => {
            if (nullable(signatory)) {
              return { message: 'transfer.noSignatoryError' };
            }

            const required = new BN(multisigDeposit).add(new BN(fee));
            if (hasAnyMultisig && required.gt(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            hasAnyMultisig: $hasAnyMultisig,
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (value, fields, { fee, hasAnyMultisig, network, delegateBalanceRange, initiatorBalance }) => {
            if (!value) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const delegateBalance = Array.isArray(delegateBalanceRange)
              ? delegateBalanceRange[1]
              : delegateBalanceRange;

            if (amountBN.gt(new BN(delegateBalance))) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            if (!hasAnyMultisig && fields.initiator) {
              if (amountBN.add(new BN(fee)).gt(new BN(initiatorBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
    conviction: {
      defaultValue: 'Locked1x',
    },
    locks: {
      defaultValue: {},
    },
  },
  validateOn: ['submit'],
});

const $walletData = combine({
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
);

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
    trackLocks: locksAggregate.$trackLocks,
  },
  ({ network, wallet, initiator, balances, trackLocks }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    const lock = getLocksForAccount(initiator.accountId, trackLocks);

    return {
      account: initiator,
      balance: transferableAmountBN(balance),
      lock,
      available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
    };
  },
);

const $initiatorBalance = $account.map((account) => {
  return account?.available.toString() || ZERO_BALANCE;
});

const $delegateBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $coreTx = combine(
  {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    signatory: form.fields.signatory.$value,
    delegateData: $delegateData,
  },
  ({ walletData, target, tracks, signatory, delegateData }) => {
    if (!walletData.chain || !target || tracks.length === 0 || !signatory || !delegateData) return null;

    return transactionBuilder.buildDelegate({
      chain: walletData.chain,
      accountId: signatory.accountId,
      balance: (walletData.chain && formatAmount(delegateData.balance, walletData.chain.assets[0]!.precision)) || '0',
      conviction: delegateData.conviction || 'None',
      target: target.accountId,
      tracks,
    });
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

// signing path

const signingPathChanged = createEvent<PathNode[]>();
const $signingPath = createStore<PathNode[]>([])
  .on(signingPathChanged, (_, path) => path)
  .reset(formInitiated);

const $userOverrodePath = createStore(false)
  .on(signingPathChanged, () => true)
  .reset(formInitiated, form.fields.initiator.change);

const $chainIdForPath = $chain.map((c) => c?.chainId ?? null);
const $defaultSigningPath = graphModel.$defaultPathFor(form.fields.initiator.$value, $chainIdForPath);

sample({
  clock: $defaultSigningPath,
  source: $userOverrodePath,
  filter: (userOverrode) => !userOverrode,
  fn: (_, defaultPath) => defaultPath,
  target: $signingPath,
});

const $signatoryFromPath = combine(
  { path: $signingPath, allAccounts: accounts.$list, chain: $chain },
  ({ path, allAccounts, chain }): AnyAccount | null => {
    if (nullable(chain)) return null;
    const last = path.at(-1);
    if (!last || last.kind !== 'signer') return null;
    return (
      allAccounts.find((a) => a.accountId === last.accountId && accountService.isAccountAvailableOnChain(a, chain)) ??
      null
    );
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
});

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);
const $hasAnyMultisig = $route.map((route) => nonNullable(route.find(accountUtils.isAnyMultisigAccount)));
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

// Multisig deposit calculation
const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
    if (!isProxy || !network || !proxyAccount) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ signatory, balances, network }) => {
    if (!signatory || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    pendingFee: $pendingFee,
  },
  ({ isFormValid, pendingFee }) => isFormValid && !pendingFee,
);

sample({
  clock: formInitiated,
  target: form.reset,
});

// Pre-select first signatory automatically
sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

// Dropdown → path sync.
sample({
  clock: form.fields.signatory.$value,
  source: {
    initiator: form.fields.initiator.$value,
    chain: $chain,
    currentPath: $signingPath,
    multisigByAccountId: graphModel.$multisigByAccountId,
    proxies: proxyModel.$proxies,
    ownSignerAccountIds: graphModel.$ownSignerAccountIds,
    resolveName: graphModel.$nameResolver,
  },
  filter: ({ initiator, chain, currentPath }, signatory) => {
    if (!initiator || !chain || !signatory) return false;
    const last = currentPath.at(-1);
    if (last && last.kind === 'signer' && last.accountId === signatory.accountId) return false;
    return accountUtils.isAnyMultisigAccount(initiator) || accountUtils.isProxiedAccount(initiator);
  },
  fn: ({ initiator, chain, multisigByAccountId, proxies, ownSignerAccountIds, resolveName }, signatory): PathNode[] => {
    return graphModel.pickDefaultPath({
      initiator: initiator!,
      chainId: chain!.chainId,
      multisigByAccountId,
      proxies,
      ownSignerAccountIds,
      resolveName,
      targetSigner: signatory!.accountId,
    });
  },
  target: signingPathChanged,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => nonNullable(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    initiator: shards[0],
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
});

// Submit

sample({
  clock: form.$values.updates,
  source: { networkStore: $networkStore, account: $account },
  filter: ({ networkStore, account }) => nonNullable(networkStore) && nonNullable(account),
  fn: ({ account }, formData) => {
    const locks = account ? { [account.account.accountId]: account.lock } : {};

    return { ...formData, locks };
  },
  target: formChanged,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,
  $signingPath,

  $account,
  $initiatorBalance,
  $delegateBalanceRange,
  $proxyBalance,

  $api,
  $networkStore,
  $hasAnyMultisig,
  $canSubmit,

  $fee,
  $pendingFee,
  $tx,
  $route,
  $multisigDeposit,

  $walletData,
  $coreTx,
  $proxyAccount,

  events: {
    formInitiated,
    formCleared,
    signingPathChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
