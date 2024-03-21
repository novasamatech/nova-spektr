import { createEvent, createStore, combine, sample, restore } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';
import { BN } from '@polkadot/util';

import { Chain, Account, Address, PartialBy, type ChainId } from '@shared/core';
import { walletModel, walletUtils, accountUtils, permissionUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { Transaction, TransactionType } from '@entities/transaction';
import { xcmTransferModel } from './xcm-transfer-model';
import { TransferType } from '../lib/constants';
import { NetworkStore } from '../lib/types';
import {
  transferableAmount,
  dictionary,
  toAddress,
  TEST_ACCOUNTS,
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
  transaction: Transaction;
  formData: PartialBy<FormParams, 'signatory'> & {
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

const $fee = restore(feeChanged, '0');
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);
const $isXcm = createStore<boolean>(false);

const $transferForm = createForm<FormParams>({
  fields: {
    account: {
      init: {} as Account,
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
            isXcm: $isXcm,
            xcmFee: xcmTransferModel.$xcmFee,
            network: $networkStore,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { isXcm, xcmFee, network, accountBalance }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const xcmFeeBN = new BN(isXcm ? xcmFee : '0');

            return amountBN.add(xcmFeeBN).lte(new BN(accountBalance[0]));
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
            if (isMultisig) return true;

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const xcmFeeBN = new BN(isXcm ? rest.xcmFee : '0');

            return isNative
              ? new BN(rest.fee).add(amountBN).add(xcmFeeBN).lte(new BN(accountBalance[1]))
              : new BN(rest.fee).lte(new BN(accountBalance[1]));
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

const $proxyWallet = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    account: $transferForm.fields.account.$value,
    accounts: walletModel.$accounts,
  },
  ({ wallet, wallets, account, accounts }) => {
    if (!wallet || !accountUtils.isProxiedAccount(account)) return undefined;

    const proxyAccount = accounts.find((a) => a.accountId === account.proxyAccountId);

    return proxyAccount ? walletUtils.getWalletById(wallets, proxyAccount.id) : undefined;
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
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    account: $transferForm.fields.account.$value,
    accounts: walletModel.$accounts,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, wallets, account, accounts, balances }) => {
    if (!wallet || !network || !accountUtils.isMultisigAccount(account)) return [];

    const { chain, asset } = network;
    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balances: string[] }[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
      const isAvailable = permissionUtils.canCreateMultisigTx(wallet, walletAccounts);

      if (!isAvailable) return acc;

      const signer = walletAccounts.find((a) => signers[a.accountId] && accountUtils.isChainAndCryptoMatch(a, chain));

      if (signer) {
        const balance = balanceUtils.getBalance(balances, signer.accountId, chain.chainId, asset.assetId.toString());

        let nativeBalance = balance;
        if (asset.assetId !== chain.assets[0].assetId) {
          nativeBalance = balanceUtils.getBalance(
            balances,
            signer.accountId,
            chain.chainId,
            chain.assets[0].assetId.toString(),
          );
        }

        acc.push({
          signer,
          balances: [transferableAmount(balance), transferableAmount(nativeBalance)],
        });

        delete signers[signer.accountId];
      }

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

const $transaction = combine(
  {
    network: $networkStore,
    isNative: $isNative,
    isXcm: $isXcm,
    form: $transferForm.$values,
    xcmData: xcmTransferModel.$xcmData,
    isConnected: $isChainConnected,
  },
  ({ network, isNative, isXcm, form, xcmData, isConnected }): Transaction | undefined => {
    if (!network || !isConnected || (isXcm && !xcmData)) return undefined;

    const { chain, asset } = network;
    let transactionType = isNative ? TransactionType.TRANSFER : TransferType[asset.type!];
    if (isXcm && xcmData) {
      transactionType = xcmData.transactionType;
    }

    return {
      chainId: chain.chainId,
      address: toAddress(form.account.accountId, { prefix: chain.addressPrefix }),
      type: transactionType,
      args: {
        dest: toAddress(form.destination || TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
        value: formatAmount(form.amount, asset.precision) || '1',
        ...(!isNative && { asset: getAssetId(asset) }),
        ...(isXcm && xcmData?.args),
      },
    };
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $transferForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isXcmFeeLoading: xcmTransferModel.$isXcmFeeLoading,
  },
  ({ isFormValid, isFeeLoading, isXcmFeeLoading }) => {
    return isFormValid && !isFeeLoading && !isXcmFeeLoading;
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
  source: walletModel.$activeWallet,
  filter: (_, account) => Boolean(account),
  fn: (wallet): Record<string, boolean> => {
    if (!wallet) return { isMultisig: false, isProxy: false };
    if (walletUtils.isMultisig(wallet)) return { isMultisig: true, isProxy: false };
    if (!walletUtils.isProxied(wallet)) return { isMultisig: false, isProxy: false };

    return {
      isMultisig: walletUtils.isMultisig(wallet),
      isProxy: true,
    };
  },
  target: spread({
    isMultisig: $isMultisig,
    isProxy: $isProxy,
  }),
});

sample({
  clock: $transferForm.fields.account.onChange,
  source: {
    signatories: $signatories,
    isMultisig: $isMultisig,
  },
  filter: ({ isMultisig, signatories }) => {
    return isMultisig && signatories.length > 0;
  },
  fn: ({ signatories }) => signatories[0].signer,
  target: $transferForm.fields.signatory.onChange,
});

sample({
  clock: $transferForm.fields.account.$value,
  source: $accounts,
  fn: (accounts, account) => {
    const match = accounts.find((a) => a.account.id === account.id);

    return match?.balances || ['0', '0'];
  },
  target: $accountBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  source: $signatories,
  fn: (signatories, signatory) => {
    const match = signatories.find(({ signer }) => signer.id === signatory.id);

    return match?.balances || ['0', '0'];
  },
  target: $signatoryBalance,
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
    network: $networkStore,
    transaction: $transaction,
    fee: $fee,
    xcmFee: xcmTransferModel.$xcmFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return Boolean(network) && Boolean(transaction);
  },
  fn: ({ network, transaction, ...fee }, formData) => {
    const signatory = Object.keys(formData.signatory).length > 0 ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const shortAddress = toShortAddress(formData.destination);
    const defaultText = `Transfer ${formData.amount} ${network!.asset.symbol} to ${shortAddress}`;
    const description = signatory ? formData.description || defaultText : '';
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      transaction: transaction!,
      formData: { ...formData, amount, signatory, description, ...fee },
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

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
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
