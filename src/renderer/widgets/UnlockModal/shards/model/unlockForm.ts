import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';

import { type ClaimChunkWithAccountId } from '@/shared/api/governance';
import { type Asset, type Chain, type ProxiedAccount, type Transaction } from '@/shared/core';
import { ZERO_BALANCE, dictionary, nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { networkSelectorModel } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { type AccountWithClaim } from '../lib/types';

type Accounts = {
  account: AccountWithClaim;
  balance: string;
};

type FormParams = {
  shards: AccountWithClaim[];
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    coreTx: Transaction;
  }[];
  formData: FormParams & {
    initiator: AnyAccount | null;
    signatory: AnyAccount | null;
    chain: Chain;
    asset: Asset;
    fee: string;
    totalLock: BN;
    totalFee: string;
    multisigDeposit: string;
    proxiedAccount?: ProxiedAccount;
  };
};

const formInitiated = createEvent<ClaimChunkWithAccountId[]>();
const formSubmitted = createEvent<FormSubmitEvent>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);
const $selectedSignatories = createStore<AnyAccount[]>([]);
const $accounts = createStore<Accounts[]>([]);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $totalFee = restore(totalFeeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $unlockForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] satisfies AccountWithClaim[],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance));
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
            fee: $fee,
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { fee, isMultisig, signatoryBalance, multisigDeposit }) => {
            if (!isMultisig) return true;

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance));
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
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: t('transfer.notZeroAmountError'),
          validator: (value) => value !== ZERO_BALANCE,
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: t('transfer.notEnoughBalanceForFeeError'),
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            accounts: $accounts,
          }),
          validator: (
            value,
            form,
            { fee, isMultisig, accounts }: { fee: string; isMultisig: boolean; accounts: Accounts[] },
          ) => {
            if (isMultisig) return true;

            const accountsBalances = accounts.reduce<string[]>((acc, { account, balance }) => {
              if (form.shards.includes(account)) {
                acc.push(balance);
              }

              return acc;
            }, []);

            return form.shards.every((_: AccountWithClaim, index: number) => {
              return new BN(fee).lte(new BN(accountsBalances[index] ?? 0));
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $shards = combine(
  {
    activeWallet: walletSelect.$selectedWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ activeWallet, chain }) => {
    if (!chain || !activeWallet) return [];

    return (
      activeWallet.accounts.filter((account, _, collection) => {
        const isBaseAccount = accountUtils.isVaultBaseAccount(account);
        const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
        const hasManyAccounts = collection.length > 1;

        if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
          return false;
        }

        return accountService.isAccountAvailableOnChain(account, chain);
      }) || []
    );
  },
);

const $txWrappers = combine(
  {
    wallet: walletSelect.$selectedWallet,
    wallets: walletModel.$wallets,
    chain: networkSelectorModel.$governanceChain,
    shards: $shards,
    signatories: $selectedSignatories,
  },
  ({ wallet, wallets, chain, shards, signatories }) => {
    if (!wallet || !chain || shards.length !== 1) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isVaultBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0]!,
      signatories,
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: $unlockForm.fields.shards.$value,
  },
  ({ txWrappers, shards }) => {
    if (shards.length === 0) return [];

    const firstWrapper = txWrappers[0];
    if (nullable(firstWrapper)) return shards;

    if (transactionService.isMultisig(firstWrapper)) {
      return [firstWrapper.multisigAccount];
    }

    return [firstWrapper.proxyAccount];
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    accounts: $realAccounts,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, accounts, wallets }) => {
    if (!isProxy || accounts.length === 0) return undefined;

    return walletUtils.getWalletById(wallets, accounts[0]!.walletId);
  },
  { skipVoid: false },
);

const $signatories = combine(
  {
    network: networkSelectorModel.$network,
    txWrappers: $txWrappers,
  },
  ({ network, txWrappers }) => {
    if (!network || !txWrappers) return [];

    return txWrappers.reduce<AnyAccount[][]>((acc, wrapper) => {
      if (!transactionService.isMultisig(wrapper)) return acc;

      acc.push(wrapper.signatories);

      return acc;
    }, []);
  },
);

const $isChainConnected = combine(
  {
    chainId: networkSelectorModel.$governanceChainId,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    if (nullable(chainId)) return false;

    const status = statuses[chainId];
    if (nullable(status)) return false;

    return networkUtils.isConnectedStatus(status);
  },
);

const $pureTxs = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    shards: $unlockForm.fields.shards.$value,
    isConnected: $isChainConnected,
  },
  ({ chain, shards, isConnected }) => {
    if (!chain || !isConnected || !shards) return undefined;

    return shards.map((shard) => {
      return transactionBuilder.buildUnlock({
        actions: shard.actions || [],
        chain: chain,
        accountId: shard.accountId,
        amount: shard.amount || ZERO_BALANCE,
        target: shard.accountId,
      });
    });
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    apis: networkModel.$apis,
    chain: networkSelectorModel.$governanceChain,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ apis, chain, pureTxs, txWrappers }) => {
    if (!chain || !pureTxs) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api: apis[chain.chainId]!,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ apis, chainId }) => {
    return chainId ? (apis[chainId] ?? null) : null;
  },
);

// Form's fields

sample({
  clock: formInitiated,
  target: [$unlockForm.reset, $selectedSignatories.reinit],
});

sample({
  clock: formInitiated,
  source: unlockModel.$totalUnlock,
  fn: (totalUnlock) => totalUnlock.toString(),
  target: $unlockForm.fields.amount.onChange,
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards, claims) => {
    const shardsMap = dictionary(shards, 'accountId');
    const result: AccountWithClaim[] = [];

    for (const claim of claims) {
      const shard = shardsMap[claim.accountId];

      if (!shard) continue;

      result.push({
        ...shard,
        actions: claim.actions,
        amount: claim.amount.toString(),
      });
    }

    return result;
  },
  target: $unlockForm.fields.shards.onChange,
});

sample({
  clock: formInitiated,
  source: {
    shards: $unlockForm.fields.shards.$value,
    claimable: unlockModel.$claimable,
  },
  filter: ({ shards, claimable }) => !!claimable || shards.length > 0,
  fn: ({ shards, claimable }) => {
    return shards.map((shard) => {
      const balance = claimable?.[shard.accountId] || BN_ZERO;

      return {
        account: shard,
        balance: balance.toString(),
      };
    });
  },
  target: $accounts,
});

sample({
  clock: $unlockForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: networkSelectorModel.$network,
  },
  fn: ({ balances, network }, signatory) => {
    if (!signatory || !network) return ZERO_BALANCE;

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
  clock: $unlockForm.fields.signatory.$value,
  filter: (signatory: AnyAccount | null): signatory is AnyAccount => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: $unlockForm.fields.shards.onChange,
  target: $unlockForm.fields.amount.resetErrors,
});

sample({
  clock: $unlockForm.fields.shards.onChange,
  fn: (shards) => {
    return shards.reduce((acc, shard) => acc.add(new BN(shard.amount || BN_ZERO)), BN_ZERO).toString();
  },
  target: $unlockForm.fields.amount.onChange,
});

const $canSubmit = combine(
  {
    isFormValid: $unlockForm.$isValid,
    isFeeLoading: $isFeeLoading,
    shards: $unlockForm.fields.shards.$value,
  },
  ({ isFormValid, isFeeLoading, shards }) => {
    return isFormValid && !isFeeLoading && shards.length > 0;
  },
);

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => transactionService.hasMultisig(txWrappers),
  target: $isMultisig,
});

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => transactionService.hasProxy(txWrappers),
  target: $isProxy,
});

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balanceMap,
    network: networkSelectorModel.$network,
    proxyAccounts: $realAccounts,
  },
  filter: ({ isProxy, network, proxyAccounts }) => {
    return isProxy && !!network && proxyAccounts.length > 0;
  },
  fn: ({ balances, network, proxyAccounts }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccounts[0]!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

sample({
  clock: $unlockForm.formValidated,
  source: {
    realAccounts: $realAccounts,
    network: networkSelectorModel.$network,
    transactions: $transactions,
    isProxy: $isProxy,
    fee: $fee,
    totalFee: $totalFee,
    multisigDeposit: $multisigDeposit,
    totalLock: locksModel.$totalLock,
  },
  filter: ({ network, transactions }) => {
    return nonNullable(network) && nonNullable(transactions);
  },
  fn: ({ realAccounts, network, transactions, totalLock, isProxy, ...fee }, formData) => {
    const { shards, ...rest } = formData;

    return {
      transactions: transactions!.map((tx) => ({
        wrappedTx: tx.wrappedTx,
        coreTx: tx.coreTx,
      })),
      formData: {
        ...fee,
        ...rest,
        initiator: realAccounts[0] ?? null,
        shards: realAccounts,
        amount: formData.amount,
        chain: network!.chain,
        asset: network!.asset,
        totalLock,

        ...(isProxy && { proxiedAccount: shards[0] as ProxiedAccount }),
      },
    } satisfies FormSubmitEvent;
  },
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$unlockForm.reset, $selectedSignatories.reinit],
});

export const unlockFormAggregate = {
  $unlockForm,
  $api,
  $canSubmit,
  $txWrappers,
  $transactions,
  $realAccounts,
  $shards,
  $isFeeLoading,
  $accounts,
  $fee,

  $isProxy,
  $isMultisig,
  $proxyWallet,
  $selectedSignatories,
  $signatories,

  $proxyBalance,
  $signatoryBalance,

  formInitiated,
  formCleared,
  feeChanged,
  totalFeeChanged,
  multisigDepositChanged,
  isFeeLoadingChanged,
  formSubmitted,
};
