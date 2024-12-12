import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import isEmpty from 'lodash/isEmpty';
import { spread } from 'patronum';

import { type ClaimChunkWithAddress } from '@/shared/api/governance';
import {
  type Account,
  type Asset,
  type Chain,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
} from '@/shared/core';
import { ZERO_BALANCE, nonNullable, toAddress, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { networkSelectorModel } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { type AccountWithClaim } from '@/features/governance/types/structs';

type Accounts = {
  account: AccountWithClaim;
  balance: string;
};

type FormParams = {
  shards: AccountWithClaim[];
  signatory: Account | null;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  }[];
  formData: FormParams & {
    signatory: Account | null;
    chain: Chain;
    asset: Asset;
    fee: string;
    totalLock: BN;
    totalFee: string;
    multisigDeposit: string;
    proxiedAccount?: ProxiedAccount;
  };
};

const formInitiated = createEvent<ClaimChunkWithAddress[]>();
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
const $selectedSignatories = createStore<Account[]>([]);
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
          errorText: 'transfer.noSignatoryError',
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!signatory || !isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
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
          errorText: 'transfer.requiredAmountError',
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: 'transfer.notZeroAmountError',
          validator: (value) => value !== ZERO_BALANCE,
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            accounts: $accounts,
          }),
          validator: (value, form, { fee, isMultisig, accounts }) => {
            if (isMultisig) return true;

            const accountsBalances = (accounts as Accounts[]).reduce<string[]>((acc, { account, balance }) => {
              if (form.shards.includes(account)) {
                acc.push(balance);
              }

              return acc;
            }, []);

            return form.shards.every((_: AccountWithClaim, index: number) => {
              return new BN(fee).lte(new BN(accountsBalances[index]));
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
    activeWallet: walletModel.$activeWallet,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ activeWallet, chainId }) => {
    if (!chainId || !activeWallet) return [];

    return (
      activeWallet.accounts.filter((account, _, collection) => {
        const isBaseAccount = accountUtils.isBaseAccount(account);
        const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
        const hasManyAccounts = collection.length > 1;

        if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
          return false;
        }

        return accountUtils.isChainIdMatch(account, chainId);
      }) || []
    );
  },
);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
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
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0],
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
    if (txWrappers.length === 0) return shards;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return [(txWrappers[0] as MultisigTxWrapper).multisigAccount];
    }

    return [(txWrappers[0] as ProxyTxWrapper).proxyAccount];
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

    return walletUtils.getWalletById(wallets, accounts[0].walletId);
  },
  { skipVoid: false },
);

const $signatories = combine(
  {
    chainId: networkSelectorModel.$governanceChainId,
    network: networkSelectorModel.$network,
    txWrappers: $txWrappers,
    balances: balanceModel.$balances,
  },
  ({ chainId, network, txWrappers, balances }) => {
    if (!chainId || !network || !txWrappers) return [];

    return txWrappers.reduce<{ signer: Account; balance: string }[][]>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(
          balances,
          signatory.accountId,
          chainId,
          network.asset.assetId.toString(),
        );

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

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
    if (!chainId) return false;

    return networkUtils.isConnectedStatus(statuses[chainId]);
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
        api: apis[chain.chainId],
        addressPrefix: chain.addressPrefix,
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
    return chainId ? apis[chainId] : null;
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
  source: {
    shards: $shards,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ shards, chain }) => shards.length > 0 && !!chain,
  fn: ({ shards, chain }, claims) => {
    return claims.reduce<AccountWithClaim[]>((acc, claim) => {
      const shard = shards.find(
        (shard) => claim.address === toAddress(shard.accountId, { prefix: chain!.addressPrefix }),
      );

      if (!shard) return acc;

      return [...acc, { ...shard, actions: claim.actions, amount: claim.amount.toString(), address: claim.address }];
    }, []);
  },
  target: $unlockForm.fields.shards.onChange,
});

sample({
  clock: formInitiated,
  source: {
    chainId: networkSelectorModel.$governanceChainId,
    network: networkSelectorModel.$network,
    shards: $unlockForm.fields.shards.$value,
    balances: balanceModel.$balances,
  },
  filter: ({ chainId, network, shards }) => !!chainId || !!network || shards.length > 0,
  fn: ({ chainId, network, shards, balances }) => {
    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chainId!, network!.asset.assetId.toString());

      return {
        account: shard,
        balance: transferableAmount(balance),
      };
    });
  },
  target: $accounts,
});

sample({
  clock: $unlockForm.fields.signatory.onChange,
  source: $signatories,
  filter: (signatories) => !isEmpty(signatories),
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: $unlockForm.fields.signatory.$value,
  filter: (signatory: Account | null): signatory is Account => nonNullable(signatory),
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
  fn: (txWrappers) => ({
    isProxy: transactionService.hasProxy(txWrappers),
    isMultisig: transactionService.hasMultisig(txWrappers),
  }),
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
  }),
});

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
    network: networkSelectorModel.$network,
    proxyAccounts: $realAccounts,
  },
  filter: ({ isProxy, network, proxyAccounts }) => {
    return isProxy && !!network && proxyAccounts.length > 0;
  },
  fn: ({ balances, network, proxyAccounts }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccounts[0].accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
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
        multisigTx: tx.multisigTx,
        coreTx: tx.coreTx,
      })),
      formData: {
        ...fee,
        ...rest,
        shards: realAccounts,
        amount: formData.amount,
        chain: network!.chain,
        asset: network!.asset,
        totalLock,

        ...(isProxy && { proxiedAccount: shards[0] as ProxiedAccount }),
      },
    };
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

  events: {
    formInitiated,
    formCleared,
    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },

  output: {
    formSubmitted,
  },
};
