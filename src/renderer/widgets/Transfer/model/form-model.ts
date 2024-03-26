import { createEvent, createStore, combine, sample, restore } from 'effector';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { xcmTransferModel } from './xcm-transfer-model';
import { NetworkStore } from '../lib/types';
import {
  Transaction,
  transactionBuilder,
  transactionService,
  TxWrapper,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@entities/transaction';
import {
  Chain,
  Account,
  Address,
  PartialBy,
  type ChainId,
  MultisigAccount,
  ProxiedAccount,
  Wallet,
} from '@shared/core';
import {
  transferableAmount,
  dictionary,
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

    return getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account,
      accounts: chainFilteredAccounts,
      signatories,
    });
  },
);

$txWrappers.watch((v) => {
  console.log('=== wrapper', v);
});

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
            txWrappers: $txWrappers,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { fee, txWrappers, signatoryBalance, multisigDeposit }) => {
            if (!transactionService.hasMultisig(txWrappers)) return true;

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
            txWrappers: $txWrappers,
            accountBalance: $accountBalance,
          }),
          validator: (value, _, { network, isNative, txWrappers, isXcm, accountBalance, ...rest }) => {
            if (transactionService.hasMultisig(txWrappers)) return true;

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

$transaction.watch((v) => {
  console.log('=== tx', v);
});

const $isMultisig = combine($txWrappers, (txWrappers) => {
  return transactionService.hasMultisig(txWrappers);
});

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

$transferForm.$values.watch((x) => {
  console.log('=== vals', x.amount);
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

type TxWrappersParams = {
  wallets: Wallet[];
  wallet: Wallet;
  accounts: Account[];
  account: Account;
  signatories?: Account[];
};
function getTxWrappers({ wallets, wallet, accounts, account, signatories = [] }: TxWrappersParams): TxWrapper[] {
  if (walletUtils.isMultisig(wallet)) {
    const signersMap = dictionary((account as MultisigAccount).signatories, 'accountId', () => true);

    const sigs = wallets.reduce<Account[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts((wallet as Wallet).id, accounts);
      const signer = walletAccounts.find((a) => signersMap[a.accountId]);

      if (signer) {
        acc.push(signer);
      }

      return acc;
    }, []);

    const wrapper: MultisigTxWrapper = {
      kind: 'multisig',
      multisigAccount: account as MultisigAccount,
      signatories: sigs,
      signer: signatories[0] || ({} as Account),
    };

    if (signatories.length === 0) return [wrapper];
    const signatoryAccount = sigs.find((s) => s.id === signatories[0].id);

    if (!signatoryAccount) return [wrapper];
    const signatoryWallet = walletUtils.getWalletById(wallets, signatoryAccount.walletId);

    const nextWrappers = getTxWrappers({
      wallets,
      wallet: signatoryWallet as Wallet,
      accounts,
      account: signatoryAccount as Account,
      signatories: signatories.slice(1),
    });

    return [wrapper, ...nextWrappers];
  }

  if (walletUtils.isProxied(wallet)) {
    const proxiesMap = wallets.reduce<{ wallet: Wallet; account: Account }[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
      const match = walletAccounts.find((a) => a.accountId === (account as ProxiedAccount).proxyAccountId);

      if (match) {
        acc.push({ wallet, account: match });
      }

      return acc;
    }, []);

    const wrapper: ProxyTxWrapper = {
      kind: 'proxy',
      proxyAccount: proxiesMap[0].account,
      proxiedAccount: account as ProxiedAccount,
    };

    const nextWrappers = getTxWrappers({
      wallets,
      wallet: proxiesMap[0].wallet,
      accounts,
      account: proxiesMap[0].account,
      signatories,
    });

    return [wrapper, ...nextWrappers];
  }

  return [];
}
