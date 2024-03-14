import { createEvent, createStore, combine, sample } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import { Chain, Account, Asset } from '@shared/core';
import { walletModel, walletUtils, accountUtils, permissionUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { transferableAmount, dictionary } from '@shared/lib/utils';

const formInitiated = createEvent<{ chain: Chain; asset: Asset }>();
const formSubmitted = createEvent();

const myselfClicked = createEvent();

const $chain = createStore<Chain | null>(null);
const $asset = createStore<Asset | null>(null);

const $canSubmit = createStore<boolean>(true);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $transferForm = createForm({
  fields: {
    account: {
      init: {} as Account,
    },
    signatory: {
      init: {} as Account,
    },
    // xcmChain: {
    //   init: {} as Chain,
    // },
    destination: {
      init: '',
    },
    amount: {
      init: '',
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

const $accountBalance = combine(
  {
    accounts: $accounts,
    account: $transferForm.fields.account.$value,
  },
  ({ accounts, account }) => {
    const match = accounts.find((a) => a.account.id === account.id);

    return match?.balances || ['0', '0'];
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

// const $accountBalance = combine(
//   {
//     accounts: $accounts,
//     account: $transferForm.fields.account.$value,
//   },
//   ({ accounts, account }) => {
//     const match = accounts.find((a) => a.account.id === account.id);
//
//     return match?.balances || ['0', '0'];
//   },
// );

// Fields connections

sample({
  clock: formInitiated,
  target: spread({
    chain: $chain,
    asset: $asset,
  }),
});

sample({
  clock: formInitiated,
  target: $transferForm.reset,
});

sample({
  clock: formInitiated,
  source: $accounts,
  fn: (accounts) => accounts[0].account,
  target: $transferForm.fields.account.onChange,
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
  clock: $transferForm.fields.account.onChange,
  source: walletModel.$activeWallet,
  filter: (_, account) => Boolean(account),
  fn: (wallet, account): Record<string, boolean> => {
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

export const formModel = {
  $transferForm,
  $proxyWallet,
  $signatories,
  $isMultisig,

  $chain,
  $asset,
  $accounts,
  $accountBalance,

  $canSubmit,
  events: {
    formInitiated,
    myselfClicked,
  },
  output: {
    formSubmitted,
  },
};
