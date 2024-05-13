import { createEvent, createStore, combine, sample, restore } from 'effector';
import { spread } from 'patronum';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { xcmTransferModel } from './xcm-transfer-model';
import { NetworkStore } from '../lib/types';
import type { Chain, Account, Address, PartialBy, ChainId, ProxiedAccount, AccountId } from '@shared/core';
import {
  Transaction,
  transactionBuilder,
  transactionService,
  MultisigTxWrapper,
  ProxyTxWrapper,
  DESCRIPTION_LENGTH,
} from '@entities/transaction';
import {
  transferableAmount,
  getAssetId,
  formatAmount,
  validateAddress,
  toShortAddress,
  toAccountId,
  toAddress,
  ZERO_BALANCE,
} from '@shared/lib/utils';

type BalanceMap = Record<'balance' | 'native', string>;

type FormParams = {
  account: Account;
  xcmChain: Chain;
  signatory: Account;
  destination: Address;
  amount: string;
  description: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: PartialBy<FormParams, 'signatory'> & {
    proxiedAccount?: ProxiedAccount;
    fee: string;
    xcmFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const myselfClicked = createEvent();
const xcmDestinationSelected = createEvent<AccountId>();
const xcmDestinationCancelled = createEvent();

const $networkStore = restore(formInitiated, null);
const $isNative = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $isMyselfXcmOpened = createStore<boolean>(false).reset(xcmDestinationCancelled);

const $accountBalance = createStore<BalanceMap>({ balance: ZERO_BALANCE, native: ZERO_BALANCE });
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<BalanceMap>({ balance: ZERO_BALANCE, native: ZERO_BALANCE });

const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $isXcm = createStore<boolean>(false);

const $selectedSignatories = createStore<Account[]>([]);

const $transferForm = createForm<FormParams>({
  fields: {
    account: {
      init: {} as Account,
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_a, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance.native));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: 'transfer.noSignatoryError',
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!isMultisig) return true;

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
    xcmChain: {
      init: {} as Chain,
    },
    destination: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'transfer.requiredRecipientError',
          validator: Boolean,
        },
        {
          name: 'incorrectRecipient',
          errorText: 'transfer.incorrectRecipientError',
          validator: validateAddress,
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
          name: 'notEnoughBalance',
          errorText: 'transfer.notEnoughBalanceError',
          source: combine({
            network: $networkStore,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { network, accountBalance }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return amountBN.lte(new BN(accountBalance.balance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isXcm: $isXcm,
            isProxy: $isProxy,
            xcmFee: xcmTransferModel.$xcmFee,
            network: $networkStore,
            isNative: $isNative,
            isMultisig: $isMultisig,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { network, isNative, isProxy, isMultisig, isXcm, accountBalance, ...rest }) => {
            const feeBN = new BN(isProxy || isMultisig ? ZERO_BALANCE : rest.fee);
            const xcmFeeBN = new BN(isXcm ? rest.xcmFee : ZERO_BALANCE);
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return isNative
              ? feeBN.add(amountBN).add(xcmFeeBN).lte(new BN(accountBalance.native))
              : feeBN.add(xcmFeeBN).lte(new BN(accountBalance.native));
          },
        },
      ],
    },
    description: {
      init: '',
      rules: [
        {
          name: 'maxLength',
          errorText: 'transfer.descriptionLengthError',
          validator: (value) => !value || value.length <= DESCRIPTION_LENGTH,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Computed

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    account: $transferForm.fields.account.$value,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, account, wallets, network, signatories }) => {
    if (!wallet || !network || !account.id) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account,
      signatories,
    });
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $transferForm.fields.account.$value,
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

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;
    const walletAccounts = walletUtils.getAccountsBy([wallet], (a, w) => {
      const isBase = accountUtils.isBaseAccount(a);
      const isPolkadotVault = walletUtils.isPolkadotVault(w);

      return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());

      let nativeBalance = balance;
      if (asset.assetId !== chain.assets[0].assetId) {
        nativeBalance = balanceUtils.getBalance(
          balances,
          account.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );
      }

      return {
        account,
        balances: { balance: transferableAmount(balance), native: transferableAmount(nativeBalance) },
      };
    });
  },
);

const $signatories = combine(
  {
    network: $networkStore,
    txWrappers: $txWrappers,
    balances: balanceModel.$balances,
  },
  ({ network, txWrappers, balances }) => {
    if (!network) return [];

    const { chain } = network;

    return txWrappers.reduce<Array<{ signer: Account; balance: string }[]>>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(
          balances,
          signatory.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
  },
);

const $chains = combine(
  {
    network: $networkStore,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    transferDirections: xcmTransferModel.$transferDirections,
  },
  ({ network, chains, statuses, transferDirections }) => {
    if (!network || !transferDirections) return [];

    const xcmChains = transferDirections.reduce<Chain[]>((acc, chain) => {
      const chainId = `0x${chain.destination.chainId}` as ChainId;

      if (statuses[chainId] && networkUtils.isConnectedStatus(statuses[chainId])) {
        acc.push(chains[chainId]);
      }

      return acc;
    }, []);

    return [network.chain].concat(xcmChains);
  },
);

const $isChainConnected = combine(
  {
    network: $networkStore,
    statuses: networkModel.$connectionStatuses,
  },
  ({ network, statuses }) => {
    if (!network) return false;

    return networkUtils.isConnectedStatus(statuses[network.chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $pureTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    form: $transferForm.$values,
    xcmData: xcmTransferModel.$xcmData,
    isConnected: $isChainConnected,
  },
  ({ network, isXcm, form, xcmData, isConnected }): Transaction | undefined => {
    if (!network || !isConnected || (isXcm && !xcmData)) return undefined;

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: form.account.accountId,
      amount: form.amount,
      destination: form.destination,
      xcmData,
    });
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTx, txWrappers }) => {
    if (!networkStore || !pureTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[networkStore.chain.chainId],
      addressPrefix: networkStore.chain.addressPrefix,
      transaction: pureTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

const $destinationAccounts = combine(
  {
    isXcm: $isXcm,
    wallet: walletModel.$activeWallet,
    chain: $transferForm.fields.xcmChain.$value,
  },
  ({ isXcm, wallet, chain }) => {
    if (!isXcm || !wallet || !chain.chainId) return [];

    return walletUtils.getAccountsBy([wallet], (a, w) => {
      const isBase = accountUtils.isBaseAccount(a);
      const isPolkadotVault = walletUtils.isPolkadotVault(w);

      return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
    });
  },
);

const $isMyselfXcmEnabled = combine(
  {
    isXcm: $isXcm,
    destinationAccounts: $destinationAccounts,
  },
  ({ isXcm, destinationAccounts }) => {
    return isXcm && destinationAccounts.length > 0;
  },
);

const $canSubmit = combine(
  {
    isXcm: $isXcm,
    isFormValid: $transferForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isXcmFeeLoading: xcmTransferModel.$isXcmFeeLoading,
  },
  ({ isXcm, isFormValid, isFeeLoading, isXcmFeeLoading }) => {
    return isFormValid && !isFeeLoading && (!isXcm || !isXcmFeeLoading);
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$transferForm.reset, xcmTransferModel.events.xcmStarted, $selectedSignatories.reinit],
});

sample({
  clock: formInitiated,
  fn: ({ chain, asset }) => getAssetId(chain.assets[0]) === getAssetId(asset),
  target: $isNative,
});

sample({
  clock: formInitiated,
  filter: ({ chain, asset }) => Boolean(chain) && Boolean(asset),
  fn: ({ chain }) => chain,
  target: $transferForm.fields.xcmChain.onChange,
});

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
  clock: formInitiated,
  source: $accounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => accounts[0].account,
  target: $transferForm.fields.account.onChange,
});

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, xcmChain) => chain.chainId !== xcmChain.chainId,
  target: $isXcm,
});

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  target: $transferForm.fields.destination.reset,
});

sample({
  clock: $transferForm.fields.account.onChange,
  source: $accounts,
  fn: (accounts, account) => {
    const match = accounts.find((a) => a.account.id === account.id);

    return match?.balances || { balance: ZERO_BALANCE, native: ZERO_BALANCE };
  },
  target: $accountBalance,
});

sample({
  source: {
    isProxy: $isProxy,
    isNative: $isNative,
    balances: balanceModel.$balances,
    network: $networkStore,
    proxyAccount: $realAccount,
  },
  filter: ({ isProxy, network }) => isProxy && Boolean(network),
  fn: ({ isNative, balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    let nativeBalance = balance;
    if (!isNative) {
      nativeBalance = balanceUtils.getBalance(
        balances,
        proxyAccount.accountId,
        network!.chain.chainId,
        network!.chain.assets[0].assetId.toString(),
      );
    }

    return { balance: transferableAmount(balance), native: transferableAmount(nativeBalance) };
  },
  target: $proxyBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  source: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory.id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: myselfClicked,
  source: {
    xcmChain: $transferForm.fields.xcmChain.$value,
    destinationAccounts: $destinationAccounts,
  },
  filter: ({ xcmChain, destinationAccounts }) => {
    return Boolean(xcmChain.chainId) && destinationAccounts.length === 1;
  },
  fn: ({ xcmChain, destinationAccounts }) => {
    return toAddress(destinationAccounts[0].accountId, { prefix: xcmChain.addressPrefix });
  },
  target: $transferForm.fields.destination.onChange,
});

sample({
  clock: myselfClicked,
  source: $destinationAccounts,
  filter: (destinationAccounts) => destinationAccounts.length > 1,
  fn: () => true,
  target: $isMyselfXcmOpened,
});

sample({
  clock: xcmDestinationSelected,
  source: $transferForm.fields.xcmChain.$value,
  filter: (xcmChain) => Boolean(xcmChain.chainId),
  fn: ({ addressPrefix }, accountId) => ({
    canSelect: false,
    destination: toAddress(accountId, { prefix: addressPrefix }),
  }),
  target: spread({
    canSelect: $isMyselfXcmOpened,
    destination: $transferForm.fields.destination.onChange,
  }),
});

// XCM model Bindings

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  fn: (chain) => chain.chainId,
  target: xcmTransferModel.events.xcmChainSelected,
});

sample({
  clock: $transferForm.fields.destination.onChange,
  fn: toAccountId,
  target: xcmTransferModel.events.destinationChanged,
});

sample({
  clock: $transferForm.fields.amount.onChange,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ asset }, amount) => formatAmount(amount, asset.precision),
  target: xcmTransferModel.events.amountChanged,
});

// Submit

sample({
  clock: $transferForm.formValidated,
  source: {
    realAccount: $realAccount,
    network: $networkStore,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    xcmFee: xcmTransferModel.$xcmFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return Boolean(network) && Boolean(transaction);
  },
  fn: ({ realAccount, network, transaction, isProxy, ...fee }, formData) => {
    const signatory = formData.signatory.accountId ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const shortAddress = toShortAddress(formData.destination);
    const defaultText = `Transfer ${formData.amount} ${network!.asset.symbol} to ${shortAddress}`;
    const description = signatory ? formData.description || defaultText : '';
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...fee,
        ...formData,
        account: realAccount,
        amount,
        signatory,
        description,
        ...(isProxy && { proxiedAccount: formData.account as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

export const formModel = {
  $transferForm,
  $proxyWallet,
  $signatories,
  $txWrappers,

  $destinationAccounts,
  $isMyselfXcmEnabled,
  $isMyselfXcmOpened,

  $accounts,
  $chains,
  $accountBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $pureTx,
  $transaction,
  $isMultisig,
  $isXcm,
  $isChainConnected,
  $canSubmit,

  $xcmConfig: xcmTransferModel.$config,
  $xcmApi: xcmTransferModel.$apiDestination,

  events: {
    formInitiated,
    formCleared: $transferForm.reset,

    myselfClicked,
    xcmDestinationSelected,
    xcmDestinationCancelled,

    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    isXcmFeeLoadingChanged: xcmTransferModel.events.isXcmFeeLoadingChanged,
    xcmFeeChanged: xcmTransferModel.events.xcmFeeChanged,
  },
  output: {
    formSubmitted,
  },
};
