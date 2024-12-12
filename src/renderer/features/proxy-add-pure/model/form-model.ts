import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import {
  type Account,
  type Chain,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import {
  TEST_ACCOUNTS,
  ZERO_BALANCE,
  dictionary,
  getProxyTypes,
  isStringsMatchQuery,
  nonNullable,
  toAddress,
  transferableAmount,
  transferableAmountBN,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { operationsModel, operationsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesUtils } from '@/features/proxies';

type FormParams = {
  chain: Chain;
  account: Account;
  signatory: Account | null;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: FormParams & {
    signatory: Account | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    multisigDeposit: string;
    proxyDeposit: string;
  };
};

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const feeChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = flow.state.map(({ wallet }) => wallet);

const $oldProxyDeposit = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $newProxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $proxyQuery = createStore<string>('');

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $proxyForm = createForm<FormParams>({
  fields: {
    chain: {
      init: {} as Chain,
    },
    account: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          source: combine({
            fee: $fee,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          validator: (value, form, { isMultisig, balances, ...params }) => {
            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              form.chain.assets[0].assetId.toString(),
            );
            const proxyDeposit = new BN(params.proxyDeposit);
            const fee = new BN(params.fee);

            return isMultisig
              ? proxyDeposit.lte(withdrawableAmountBN(balance))
              : proxyDeposit.add(fee).lte(transferableAmountBN(balance));
          },
        },
      ],
    },
    signatory: {
      init: null,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          validator: (value, form, { isMultisig, balances, ...params }) => {
            if (!value || !isMultisig) return true;

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              form.chain.assets[0].assetId.toString(),
            );

            return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(withdrawableAmountBN(signatoryBalance));
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Options for selectors

const $txWrappers = combine(
  {
    wallet: $wallet,
    wallets: walletModel.$wallets,
    account: $proxyForm.fields.account.$value,
    chain: $proxyForm.fields.chain.$value,
    signatory: $proxyForm.fields.signatory.$value,
  },
  ({ wallet, account, chain, wallets, signatory }) => {
    if (!wallet || !chain || !account.id) return [];

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
      account,
      wallets: filteredWallets || [],
      signatories: nonNullable(signatory) ? [signatory] : undefined,
    });
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $proxyForm.fields.account.$value,
  },
  ({ txWrappers, account }) => {
    if (txWrappers.length === 0) return account;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $proxyChains = combine(
  {
    chains: networkModel.$chains,
    wallet: $wallet,
  },
  ({ chains, wallet }) => {
    if (!wallet) return [];

    const proxyChains = Object.values(chains).filter(proxiesUtils.isRegularProxy);
    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);

    return proxyChains.filter((chain) => {
      return wallet.accounts.some((account) => {
        if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

        return accountUtils.isChainAndCryptoMatch(account, chain);
      });
    });
  },
);

const $proxiedAccounts = combine(
  {
    wallet: $wallet,
    chain: $proxyForm.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, chain, balances }) => {
    if (!wallet || !chain.chainId) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = wallet.accounts.filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(
        balances,
        account.accountId,
        chain.chainId,
        chain.assets[0].assetId.toString(),
      );

      return { account, balance: transferableAmount(balance) };
    });
  },
);

const $signatories = combine(
  {
    wallet: $wallet,
    wallets: walletModel.$wallets,
    account: $proxyForm.fields.account.$value,
    chain: $proxyForm.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, wallets, account, chain, balances }) => {
    if (!wallet || !chain.chainId || !account || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balance: string }[]>((acc, wallet) => {
      if (!permissionUtils.canCreateMultisigTx(wallet)) return acc;

      const signer = wallet.accounts.find((a) => {
        return signers[a.accountId] && accountUtils.isChainAndCryptoMatch(a, chain);
      });

      if (signer) {
        const balance = balanceUtils.getBalance(
          balances,
          signer.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );

        acc.push({ signer, balance: transferableAmount(balance) });
      }

      return acc;
    }, []);
  },
);

const $proxyAccounts = combine(
  {
    wallets: walletModel.$wallets,
    chain: $proxyForm.fields.chain.$value,
    query: $proxyQuery,
  },
  ({ wallets, chain, query }) => {
    if (!chain.chainId) return [];

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isShardAccount(account);
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, chain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });
  },
);

const $proxyTypes = combine(
  {
    apis: networkModel.$apis,
    statuses: networkModel.$connectionStatuses,
    chain: $proxyForm.fields.chain.$value,
  },
  ({ apis, statuses, chain }) => {
    if (!chain.chainId) return [];

    return networkUtils.isConnectedStatus(statuses[chain.chainId]) ? getProxyTypes(apis[chain.chainId]) : ['Any'];
  },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: $proxyForm.fields.chain.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain.chainId) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    form: $proxyForm.$values,
  },
  ({ apis, form }) => {
    if (!form.chain.chainId) return null;

    return apis[form.chain.chainId] ?? null;
  },
);

const $pureTx = combine(
  {
    form: $proxyForm.$values,
    account: $realAccount,
    isConnected: $isChainConnected,
  },
  ({ form, account, isConnected }): Transaction | undefined => {
    if (!isConnected || !account) return undefined;

    return {
      chainId: form.chain.chainId,
      address: toAddress(account.accountId, { prefix: form.chain.addressPrefix }),
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    chain: $proxyForm.fields.chain.$value,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ apis, chain, pureTx, txWrappers }) => {
    if (!chain || !pureTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction: pureTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

const $fakeTx = combine(
  {
    chain: $proxyForm.fields.chain.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain.chainId || !isConnected) return undefined;

    return {
      chainId: chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $proxyForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isProxyDepositLoading: $isProxyDepositLoading,
  },
  ({ isFormValid, isFeeLoading, isProxyDepositLoading }) => {
    return isFormValid && !isFeeLoading && !isProxyDepositLoading;
  },
);

const $multisigAlreadyExists = combine(
  {
    apis: networkModel.$apis,
    coreTxs: $pureTx.map((tx) => (tx ? [tx] : [])),
    transactions: operationsModel.$multisigTransactions,
  },
  ({ apis, coreTxs, transactions }) => operationsUtils.isMultisigAlreadyExists({ apis, coreTxs, transactions }),
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$proxyForm.reset, $proxyQuery.reinit],
});

sample({
  clock: formInitiated,
  source: $proxyChains,
  fn: (chains) => chains[0],
  target: $proxyForm.fields.chain.onChange,
});

sample({
  clock: proxyQueryChanged,
  target: $proxyQuery,
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  target: [
    $proxyQuery.reinit,
    $proxyForm.fields.chain.resetErrors,
    $proxyForm.fields.account.resetErrors,
    $proxyForm.fields.signatory.resetErrors,
  ],
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  source: $proxiedAccounts,
  filter: (proxiedAccounts) => proxiedAccounts.length > 0,
  fn: (proxiedAccounts) => proxiedAccounts[0].account,
  target: $proxyForm.fields.account.onChange,
});

sample({
  clock: $proxyForm.fields.account.onChange,
  source: {
    wallet: $wallet,
    wallets: walletModel.$wallets,
  },
  filter: (_, account) => Boolean(account),
  fn: ({ wallet, wallets }, account): Record<string, boolean> => {
    if (!wallet) return { isMultisig: false, isProxy: false };
    if (walletUtils.isRegularMultisig(wallet)) return { isMultisig: true, isProxy: false };
    if (!walletUtils.isProxied(wallet)) return { isMultisig: false, isProxy: false };

    const accountWallet = walletUtils.getWalletById(wallets, account!.walletId);

    return {
      isMultisig: walletUtils.isRegularMultisig(accountWallet),
      isProxy: true,
    };
  },
  target: spread({
    isMultisig: $isMultisig,
    isProxy: $isProxy,
  }),
});

// Submit

sample({
  clock: $proxyForm.formValidated,
  source: {
    realAccount: $realAccount,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $newProxyDeposit,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ proxyDeposit, multisigDeposit, realAccount, transaction, isProxy, fee }, formData) => {
    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...formData,
        fee,
        account: realAccount,
        proxyDeposit,
        multisigDeposit,
        ...(isProxy && { proxiedAccount: formData.account as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

export const formModel = {
  $wallet,
  $proxyForm,
  $proxyChains,
  $proxiedAccounts,
  $signatories,
  $proxyAccounts,
  $proxyTypes,
  $proxyQuery,
  $proxyWallet,
  $txWrappers,

  $oldProxyDeposit,
  $newProxyDeposit,
  $multisigDeposit,
  $fee,

  $api,
  $fakeTx,
  $isMultisig,
  $isChainConnected,
  $canSubmit,
  $multisigAlreadyExists,

  flow,

  events: {
    formInitiated,
    proxyQueryChanged,
    proxyDepositChanged,
    multisigDepositChanged,
    feeChanged,
    isFeeLoadingChanged,
    isProxyDepositLoadingChanged,
  },

  output: {
    formSubmitted,
  },
};
