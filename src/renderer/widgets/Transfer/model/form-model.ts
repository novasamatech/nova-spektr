import { createEvent, createStore, combine, sample, restore } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';
import { BN } from '@polkadot/util';

import { Chain, Account, Asset, Address, PartialBy, type ChainId } from '@shared/core';
import { walletModel, walletUtils, accountUtils, permissionUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { Transaction, TransactionType } from '@entities/transaction';
import { xcmTransferModel } from './xcm-transfer-model';
import { TransferType } from '../lib/constants';
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
  formData: PartialBy<FormParams, 'signatory' | 'xcmChain'>;
};

const formInitiated = createEvent<{ chain: Chain; asset: Asset }>();
const formSubmitted = createEvent<FormSubmitEvent>();

const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const isXcmFeeLoadingChanged = createEvent<boolean>();

const myselfClicked = createEvent();

const $chain = createStore<Chain | null>(null);
const $asset = createStore<Asset | null>(null);
const $isNative = createStore<boolean>(false);

const $accountBalance = createStore<string[]>(['0', '0']);
const $signatoryBalance = createStore<string[]>(['0', '0']);

const $fee = restore(feeChanged, '0');
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $isXcmFeeLoading = restore(isXcmFeeLoadingChanged, false);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

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

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance[1]));
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
            asset: $asset,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { asset, accountBalance }) => {
            // if (!isMultisig) return true;

            const amountBN = new BN(formatAmount(value, asset.precision));
            // const xcmFeeBN = new BN(xcmFee || 0);

            return amountBN.lte(new BN(accountBalance[0]));
            // return amountBN.add(xcmFeeBN).lte(new BN(accountBalance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            asset: $asset,
            isNative: $isNative,
            isMultisig: $isMultisig,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { fee, asset, isNative, isMultisig, accountBalance }) => {
            if (isMultisig) return true;

            const amountBN = new BN(formatAmount(value, asset.precision));
            // const xcmFeeBN = new BN(xcmFee || 0);

            return isNative
              ? new BN(fee).add(amountBN).lte(new BN(accountBalance[1]))
              : new BN(fee).lte(new BN(accountBalance[1]));

            // return new BN(fee).add(amountBN).add(xcmFeeBN).lte(new BN(balance));
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
    chain: $chain,
    asset: $asset,
    wallet: walletModel.$activeWallet,
    accounts: walletModel.$activeAccounts,
    balances: balanceModel.$balances,
  },
  ({ chain, asset, wallet, accounts, balances }) => {
    if (!wallet || !chain || !asset) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = accounts.filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, chain);
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
    chain: $chain,
    asset: $asset,
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    account: $transferForm.fields.account.$value,
    accounts: walletModel.$accounts,
    balances: balanceModel.$balances,
  },
  ({ chain, asset, wallet, wallets, account, accounts, balances }) => {
    if (!wallet || !chain || !asset || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balances: string[] }[]>((acc, wallet) => {
      if (!permissionUtils.canCreateMultisigTx(wallet, accounts)) return acc;

      const signer = accounts.find((a) => signers[a.accountId] && accountUtils.isChainAndCryptoMatch(a, chain));

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
    chain: $chain,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    transferDirections: xcmTransferModel.$transferDirections,
  },
  ({ chain, chains, statuses, transferDirections }) => {
    if (!chain || !transferDirections) return [];

    const xcmChains = transferDirections.reduce<Chain[]>((acc, chain) => {
      const chainId = `0x${chain.destination.chainId}` as ChainId;

      if (statuses[chainId] && networkUtils.isConnectedStatus(statuses[chainId])) {
        acc.push(chains[chainId]);
      }

      return acc;
    }, []);

    return [chain].concat(xcmChains);
  },
);

const $isChainConnected = combine(
  {
    chain: $chain,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $isXcm = combine(
  {
    chain: $chain,
    xcmChain: $transferForm.fields.xcmChain.$value,
  },
  ({ chain, xcmChain }) => {
    if (!chain) return false;

    return chain.chainId !== xcmChain?.chainId;
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return undefined;

    return apis[chain.chainId];
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    chain: $chain,
    asset: $asset,
    isNative: $isNative,
    isXcm: $isXcm,
    form: $transferForm.$values,
    xcmData: xcmTransferModel.$xcmData,
    isConnected: $isChainConnected,
  },
  ({ chain, asset, isNative, isXcm, form, xcmData, isConnected }): Transaction | undefined => {
    if (!chain || !asset || !isConnected || (isXcm && !xcmData)) return undefined;

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
    isXcmFeeLoading: $isXcmFeeLoading,
  },
  ({ isFormValid, isFeeLoading, isXcmFeeLoading }) => {
    return isFormValid && !isFeeLoading && !isXcmFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  fn: ({ chain, asset }) => ({
    chain,
    asset,
    isNative: getAssetId(chain.assets[0]) === getAssetId(asset),
  }),
  target: spread({
    chain: $chain,
    asset: $asset,
    isNative: $isNative,
  }),
});

sample({
  clock: formInitiated,
  target: [$transferForm.reset, xcmTransferModel.events.xcmStarted],
});

sample({
  clock: formInitiated,
  source: $chain,
  filter: Boolean,
  target: $transferForm.fields.xcmChain.onChange,
});

sample({
  clock: formInitiated,
  source: $accounts,
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
  source: $asset,
  filter: Boolean,
  fn: (asset, amount) => formatAmount(amount, asset!.precision),
  target: xcmTransferModel.events.amountChanged,
});

// Submit

sample({
  clock: $transferForm.formValidated,
  source: {
    chain: $chain,
    asset: $asset,
    transaction: $transaction,
  },
  filter: ({ chain, asset, transaction }) => {
    return Boolean(chain) && Boolean(asset) && Boolean(transaction);
  },
  fn: ({ asset, transaction }, formData) => {
    const amount = formatAmount(formData.amount, asset!.precision);
    const signatory = Object.keys(formData.signatory).length > 0 ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const multisigDescription = `Transfer ${amount} ${asset!.symbol} to ${toShortAddress(formData.destination)}`;
    const description = signatory ? formData.description || multisigDescription : '';

    return {
      transaction: transaction!,
      formData: { ...formData, amount, signatory, description },
    };
  },
  target: formSubmitted,
});

export const formModel = {
  $transferForm,
  $proxyWallet,
  $signatories,

  $chain,
  $asset,
  $accounts,
  $chains,
  $accountBalance,

  $fee,
  $multisigDeposit,

  $api,
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
    isXcmFeeLoadingChanged,
    xcmFeeChanged: xcmTransferModel.events.xcmFeeChanged,
  },
  output: {
    formSubmitted,
  },
};
