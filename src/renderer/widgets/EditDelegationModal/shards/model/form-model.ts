import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { spread } from 'patronum';

import { type Asset, type Chain, type Conviction } from '@/shared/core';
import {
  ZERO_BALANCE,
  allEqual,
  formatAmount,
  getBalanceBn,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { getLocksForAccount } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { graphModel } from '@/features/signing-path';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  amount: string;
  conviction: Conviction;
  locks: Record<string, BN>;
  isUnchanged: boolean;
};

const formInitiated = createEvent<
  WalletData & {
    shards: AnyAccount[];
    activeDelegations: Record<
      AccountId,
      {
        conviction: Conviction;
        balance: BN;
      }
    >;
  }
>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const txWrapperChanged = createEvent<{
  proxyAccount: AnyAccount | null;
  signatories: AnyAccount[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();
const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $shards = createStore<AnyAccount[]>([]);

const $delegateBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);
const $previousConviction = createStore<Conviction>('None');

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $feeData = restore(feeDataChanged, {
  fee: ZERO_BALANCE,
  totalFee: ZERO_BALANCE,
  multisigDeposit: ZERO_BALANCE,
});

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    shards: $shards,
    balances: balanceModel.$balanceMap,
    trackLocks: locksAggregate.$trackLocks,
  },
  ({ network, wallet, shards, balances, trackLocks }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId);
      const lock = getLocksForAccount(shard.accountId, trackLocks);

      return {
        account: shard,
        balance: transferableAmountBN(balance),
        lock,
        available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
      };
    });
  },
);

const $accountsBalances = $accounts.map((accounts) => {
  return accounts.map(({ available }) => available.toString());
});

const $delegateForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, feeData }) => {
            if (!isProxy) return true;

            return new BN(feeData.fee).lte(new BN(proxyBalance));
          },
        },
        {
          name: 'noBondBalance',
          errorText: t('staking.bond.noBondBalanceError'),
          source: combine({
            isProxy: $isProxy,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (shards, form, { isProxy, network, accountsBalances }) => {
            if (isProxy || shards.length === 1) return true;

            const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

            return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
          },
        },
      ],
    },
    signatory: {
      init: null,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: t('transfer.noSignatoryError'),
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!signatory || !isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: t('proxy.addProxy.notEnoughMultisigTokens'),
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { feeData, isMultisig, signatoryBalance }) => {
            if (!isMultisig) return true;

            return new BN(feeData.multisigDeposit).add(new BN(feeData.fee)).lte(new BN(signatoryBalance));
          },
        },
      ],
    },
    amount: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('transfer.requiredAmountError'),
          validator: (value, { isUnchanged }) => isUnchanged || !!value,
        },
        {
          name: 'notZero',
          errorText: t('transfer.notZeroAmountError'),
          validator: (value, { isUnchanged }) => isUnchanged || value !== ZERO_BALANCE,
        },
        {
          name: 'notEnoughBalance',
          errorText: t('staking.notEnoughBalanceError'),
          source: combine({
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
          }),
          validator: (value, _, { network, delegateBalanceRange }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const delegateBalance = Array.isArray(delegateBalanceRange)
              ? delegateBalanceRange[1]
              : delegateBalanceRange;

            return amountBN.lte(new BN(delegateBalance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: t('transfer.notEnoughBalanceForFeeError'),
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { network, feeData, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            const feeBN = new BN(feeData.fee);
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return form.shards.every((_: AnyAccount, index: number) => {
              return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
            });
          },
        },
      ],
    },
    conviction: {
      init: 'Locked1x',
      rules: [],
    },
    locks: {
      init: {},
      rules: [],
    },
    isUnchanged: {
      init: false,
      rules: [],
    },
  },
  validateOn: ['submit'],
});

// Computed

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

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
);

const $canSubmit = combine(
  {
    isFormValid: $delegateForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// signing path

const $chain = $networkStore.map((network) => network?.chain ?? null);
const $shardInitiator = $shards.map((shards) => shards[0] ?? null);

const signingPathChanged = createEvent<PathNode[]>();
const $signingPath = createStore<PathNode[]>([])
  .on(signingPathChanged, (_, path) => path)
  .reset(formInitiated);

const $userOverrodePath = createStore(false)
  .on(signingPathChanged, () => true)
  .reset(formInitiated, $shardInitiator);

const $chainIdForPath = $chain.map((c) => c?.chainId ?? null);
const $defaultSigningPath = graphModel.$defaultPathFor($shardInitiator, $chainIdForPath);

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

sample({
  clock: $signatoryFromPath,
  filter: (fromPath): fromPath is AnyAccount => nonNullable(fromPath),
  target: $delegateForm.fields.signatory.onChange,
});

// Dropdown → path sync.
sample({
  clock: $delegateForm.fields.signatory.$value,
  source: {
    initiator: $shardInitiator,
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

// Fields connections

sample({
  clock: formInitiated,
  target: $delegateForm.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => Boolean(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    shards,
  }),
  target: spread({
    shards: $shards,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards,
  target: $delegateForm.fields.shards.onChange,
});

sample({
  clock: formInitiated,
  filter: ({ activeDelegations, shards }) => {
    const convictions = shards.map((shard) => {
      return activeDelegations[shard.accountId]?.conviction;
    });

    return allEqual(convictions);
  },
  fn: ({ activeDelegations, shards }) => {
    const accountId = shards[0]!.accountId;

    return { conviction: activeDelegations[accountId]?.conviction, isUnchanged: shards.length > 1 };
  },
  target: spread({
    conviction: $delegateForm.fields.conviction.onChange,
    isUnchanged: $delegateForm.fields.isUnchanged.onChange,
  }),
});

sample({
  clock: formInitiated,
  source: $networkStore,
  filter: (network, { shards, activeDelegations }) => {
    const balances = shards.map((shard) => {
      return activeDelegations[shard.accountId]?.balance ?? BN_ZERO;
    });

    return !!network && allEqual(balances, (a, b) => a.eq(b));
  },
  fn: (network, { shards, activeDelegations }) => {
    const accountId = shards[0]!.accountId;
    const balance = activeDelegations[accountId]?.balance.toString() ?? '0';
    const precision = network!.asset.precision;

    return getBalanceBn(balance, precision).toString();
  },
  target: $delegateForm.fields.amount.onChange,
});

sample({
  clock: formInitiated,
  fn: ({ activeDelegations, shards }) => {
    const accountId = shards[0]!.accountId;

    return activeDelegations[accountId]?.conviction ?? 'None';
  },
  target: $previousConviction,
});

sample({
  clock: txWrapperChanged,
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    signatories: $availableSignatories,
    proxyAccount: $proxyAccount,
  }),
});

sample({
  source: $accountsBalances,
  fn: (accountsBalances) => {
    if (accountsBalances.length === 0) return ZERO_BALANCE;

    const minBondBalance = accountsBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, accountsBalances[0]!);

    return minBondBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, minBondBalance];
  },
  target: $delegateBalanceRange,
});

sample({
  clock: $delegateForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  fn: ({ balances, network }, signatory) => {
    if (!network || !signatory) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $signatoryBalance,
});

sample({
  clock: $delegateForm.fields.shards.onChange,
  target: $delegateForm.fields.amount.resetErrors,
});

sample({
  clock: $delegateForm.fields.amount.onChange,
  target: $delegateForm.fields.shards.resetErrors,
});

sample({
  source: {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  filter: ({ isProxy, network, proxyAccount }) => {
    return isProxy && Boolean(network) && Boolean(proxyAccount);
  },
  fn: ({ balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: $delegateForm.$values.updates,
  source: { networkStore: $networkStore, accounts: $accounts },
  filter: ({ networkStore }) => nonNullable(networkStore),
  fn: ({ accounts }, formData) => {
    const locks = accounts.reduce((acc, val) => ({ ...acc, [val.account.accountId]: val.lock }), {});

    return { ...formData, locks };
  },
  target: formChanged,
});

sample({
  clock: $delegateForm.formValidated,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$delegateForm.reset, $shards.reinit],
});

export const formModel = {
  $delegateForm,
  $proxyWallet,
  $signatories: $availableSignatories,
  $signingPath,

  $accounts,
  $accountsBalances,
  $delegateBalanceRange,
  $proxyBalance,
  $previousConviction,

  $feeData,
  $isFeeLoading,

  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    txWrapperChanged,
    feeDataChanged,
    isFeeLoadingChanged,
    signingPathChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
