import { createEvent, createStore, combine, sample, restore } from 'effector';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { xcmTransferModel } from './xcm-transfer-model';
import { NetworkStore } from '../lib/types';
import type { Chain, Account, Address, PartialBy, ChainId, ProxiedAccount } from '@shared/core';
import {
  Transaction,
  transactionBuilder,
  transactionService,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@entities/transaction';
import {
  transferableAmount,
  getAssetId,
  formatAmount,
  validateAddress,
  toShortAddress,
  toAccountId,
} from '@shared/lib/utils';

type FormParams = {
  account: Account;
  xcmChain: Chain;
  signatory: Account;
  destination: Address;
  amount: string;
  description: string;
};

type FormSubmitEvent = {
  transaction: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
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

const $networkStore = restore(formInitiated, null);
const $isNative = createStore<boolean>(false);

const $accountBalance = createStore<string[]>(['0', '0']);
const $signatoryBalance = createStore<string[]>(['0', '0']);
const $proxyBalance = createStore<string[]>(['0', '0']);

const $fee = restore(feeChanged, '0');
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $isXcm = createStore<boolean>(false);

const $selectedSignatories = createStore<Account[]>([]);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    activeAccounts: walletModel.$activeAccounts,
    accounts: walletModel.$accounts,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, activeAccounts, accounts, wallets, network, signatories }) => {
    if (!wallet || !network) return [];

    const account = activeAccounts[0];
    const walletFiltered = wallets.filter((wallet) => {
      return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
    });
    const chainFilteredAccounts = accounts.filter((account) => {
      return accountUtils.isChainAndCryptoMatch(account, network.chain);
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account,
      accounts: chainFilteredAccounts,
      signatories,
    });
  },
);

const $isMultisig = combine($txWrappers, (txWrappers) => {
  return transactionService.hasMultisig(txWrappers);
});

const $isProxy = combine($txWrappers, (txWrappers) => {
  return transactionService.hasProxy(txWrappers);
});

const $transferForm = createForm<FormParams>({
  fields: {
    account: {
      init: {} as Account,
      // rules: [
      //   {
      //     name: 'noProxyFee',
      //     source: combine({
      //       isProxy: $isProxy,
      //       isXcm: $isXcm,
      //       fee: $fee,
      //       xcmFee: xcmTransferModel.$xcmFee,
      //       proxyBalance: $proxyBalance,
      //     }),
      //     validator: (_a, _f, { isProxy, isXcm, proxyBalance, ...rest }) => {
      //       if (!isProxy) return true;
      //
      //       const xcmFeeBN = new BN(isXcm ? rest.xcmFee : '0');
      //
      //       return new BN(rest.fee).add(xcmFeeBN).lte(new BN(proxyBalance[1]));
      //     },
      //   },
      // ],
    },
    signatory: {
      init: {} as Account,
      rules: [
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

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance[0]));
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
          errorText: 'transfer.requiredAmountError',
          validator: (value) => value !== '0',
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

            return amountBN.lte(new BN(accountBalance[0]));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isXcm: $isXcm,
            xcmFee: xcmTransferModel.$xcmFee,
            network: $networkStore,
            isNative: $isNative,
            isMultisig: $isMultisig,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { network, isNative, isMultisig, isXcm, accountBalance, ...rest }) => {
            const feeBN = new BN(isMultisig ? '0' : rest.fee);
            const xcmFeeBN = new BN(isXcm ? rest.xcmFee : '0');
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return isNative
              ? feeBN.add(amountBN).add(xcmFeeBN).lte(new BN(accountBalance[1]))
              : feeBN.add(xcmFeeBN).lte(new BN(accountBalance[1]));
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
          validator: (value) => !value || value.length <= 120,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Computed

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
    accounts: walletModel.$activeAccounts,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, accounts, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;
    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = accounts.filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, network.chain);
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
        balances: [transferableAmount(balance), transferableAmount(nativeBalance)],
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

    const { chain, asset } = network;

    return txWrappers.reduce<Array<{ signer: Account; balances: string[] }[]>>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        let nativeBalance = balance;
        if (asset.assetId !== chain.assets[0].assetId) {
          nativeBalance = balanceUtils.getBalance(
            balances,
            signatory.accountId,
            chain.chainId,
            chain.assets[0].assetId.toString(),
          );
        }

        return {
          signer: signatory,
          balances: [transferableAmount(balance), transferableAmount(nativeBalance)],
        };
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
    if (!network) return undefined;

    return apis[network.chain.chainId];
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

// const $totalFee = combine(
//   {
//     isXcm: $isXcm,
//     fee: $fee,
//     xcmFee: xcmTransferModel.$xcmFee,
//     network: $networkStore,
//   },
//   ({ isXcm, fee, xcmFee, network }) => {
//     if (!network) return '0';
//
//     const xcmFeeBN = new BN(isXcm ? xcmFee : '0');
//
//     return formatBalance(new BN(fee).add(xcmFeeBN).toString(), network.asset.precision).value;
//   },
// );

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
  fn: ({ chain, asset }) => getAssetId(chain.assets[0]) === getAssetId(asset),
  target: $isNative,
});

sample({
  clock: formInitiated,
  target: [$transferForm.reset, xcmTransferModel.events.xcmStarted],
});

sample({
  clock: formInitiated,
  filter: ({ chain, asset }) => Boolean(chain) && Boolean(asset),
  fn: ({ chain }) => chain,
  target: $transferForm.fields.xcmChain.onChange,
});

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, xcmChain) => chain.chainId !== xcmChain.chainId,
  target: $isXcm,
});

sample({
  clock: formInitiated,
  source: $accounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => accounts[0].account,
  target: $transferForm.fields.account.onChange,
});

sample({
  clock: $transferForm.fields.account.onChange,
  source: $accounts,
  fn: (accounts, account) => {
    const match = accounts.find((a) => a.account.id === account.id);

    return match?.balances || ['0', '0'];
  },
  target: $accountBalance,
});

// sample({
//   clock: $realAccount,
//   source: {
//     isProxy: $isProxy,
//     isNative: $isNative,
//     balances: balanceModel.$balances,
//     network: $networkStore,
//   },
//   filter: ({ isProxy, network }) => isProxy && Boolean(network),
//   fn: ({ isNative, balances, network }, proxyAccount) => {
//     console.log('=== new', proxyAccount.accountId);
//     const balance = balanceUtils.getBalance(
//       balances,
//       proxyAccount.accountId,
//       network!.chain.chainId,
//       network!.asset.assetId.toString(),
//     );
//
//     let nativeBalance = balance;
//     if (!isNative) {
//       nativeBalance = balanceUtils.getBalance(
//         balances,
//         proxyAccount.accountId,
//         network!.chain.chainId,
//         network!.chain.assets[0].assetId.toString(),
//       );
//     }
//
//     return [transferableAmount(balance), transferableAmount(nativeBalance)];
//   },
//   target: $proxyBalance,
// });

sample({
  clock: $transferForm.fields.signatory.$value,
  source: $signatories,
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory.id);

    return match?.balances || ['0', '0'];
  },
  target: $signatoryBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
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
    const signatory = Object.keys(formData.signatory).length > 0 ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const shortAddress = toShortAddress(formData.destination);
    const defaultText = `Transfer ${formData.amount} ${network!.asset.symbol} to ${shortAddress}`;
    const description = signatory ? formData.description || defaultText : '';
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      transaction: transaction!,
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

  $accounts,
  $chains,
  $accountBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,
  // $totalFee,

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
    myselfClicked,

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
