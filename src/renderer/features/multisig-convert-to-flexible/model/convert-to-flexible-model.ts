import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import { type Wallet } from '@/shared/core';
import { series } from '@/shared/effector';
import { Step, nonNullable, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { createMultisigDeposit, createTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts, accountsService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { multisigsModel } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const stepChanged = createEvent<Step>();
const selectSigner = createEvent<AnyAccount>();

const $step = restore(stepChanged, Step.NONE);

const $selectedSignatory = createStore<AnyAccount | null>(null).reset(flow.open);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flow.open);

const $wallet = flow.state.map(({ wallet }) => (wallet && walletUtils.isRegularMultisig(wallet) ? wallet : null));

const $multisigAccount = combine($wallet, accounts.$list, (wallet, accounts) => {
  if (nullable(wallet)) return null;
  const filteredAccounts = accountsService.filterAccountsByWallet(accounts, wallet.id);

  return filteredAccounts.find(accountUtils.isRegularMultisigAccount) || null;
});

const $chain = combine(networkModel.$chains, $multisigAccount, (chains, multisigAccount) => {
  if (!multisigAccount) return null;

  return chains[multisigAccount.chainId];
});

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return null;

    return apis[chain.chainId] ?? null;
  },
);

sample({
  clock: flow.open,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: $wallet,
  filter: nonNullable,
  target: balanceSubModel.events.walletToSubSet,
});

// signatories
const $signatories = combine(
  {
    accounts: accounts.$list,
    wallets: walletModel.$wallets,
    chain: $chain,
    multisigAccount: $multisigAccount,
  },
  ({ accounts, chain, wallets, multisigAccount }) => {
    if (!multisigAccount || !chain) return [];

    const filteredAccounts = accounts.filter(
      (account) =>
        accountUtils.isChainAndCryptoMatch(account, chain) &&
        multisigAccount.signatories.some((s) => s.accountId === account.accountId),
    );

    const matchWallets = wallets.filter(
      (w) => walletUtils.isValidSignatory(w) && filteredAccounts.some((s) => s.walletId === w.id),
    );

    return filteredAccounts.filter((a) => matchWallets.some((w) => w.id === a.walletId));
  },
);

const $signatoriesWallets = combine(
  {
    wallets: walletModel.$wallets,
    multisigAccount: $multisigAccount,
    chain: $chain,
    signatories: $signatories,
  },
  ({ wallets, multisigAccount, signatories, chain }) => {
    if (!multisigAccount || !chain) return [];

    const matchWallets = wallets.filter(
      (w) => walletUtils.isValidSignatory(w) && signatories.some((s) => s.walletId === w.id),
    );
    return matchWallets;
  },
);

sample({
  clock: $signatoriesWallets,
  target: series(balanceSubModel.events.walletToSubSet),
});

sample({
  clock: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0)!,
  target: $selectedSignatory,
});

sample({
  clock: selectSigner,
  target: $selectedSignatory,
});

// Get tx wrappers
const $coreTx = combine(
  {
    account: $multisigAccount,
    chain: $chain,
  },
  ({ account, chain }) => {
    if (nullable(chain) || nullable(account)) {
      return null;
    }

    return transactionBuilder.buildCreatePureProxy({
      chain,
      accountId: account.accountId,
    });
  },
);

const { $fee, $wrappedTx, $pendingFee } = createTxStore({
  $api,
  $activeWallet: $wallet,
  $wallets: walletModel.$wallets,
  $chain,
  $coreTx,
  $account: $multisigAccount,
  $signatory: $selectedSignatory,
});

const { $multisigDeposit } = createMultisigDeposit({
  $api: $api,
  $threshold: $multisigAccount.map((a) => a && a.threshold),
});

const $proxyDeposit = combine($api, (api) => api && proxyService.getProxyDeposit(api, '0', 1));

type Error = {
  errorText: string;
  name: string;
};

const $errors = combine(
  {
    chain: $chain,
    multisigAccount: $multisigAccount,
    selectedSignatory: $selectedSignatory,
    balances: balanceModel.$balances,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $proxyDeposit,
    fee: $fee,
  },
  ({ chain, multisigAccount, multisigDeposit, fee, balances, proxyDeposit, selectedSignatory }) => {
    if (!chain?.assets.at(0) || !multisigAccount || !selectedSignatory || !proxyDeposit) return [];

    const errors: Error[] = [];
    const multisigBalance = balanceUtils.getBalance(
      balances,
      multisigAccount.accountId,
      chain.chainId,
      chain.assets.at(0)!.assetId.toString(),
    );
    const signerBalance = balanceUtils.getBalance(
      balances,
      selectedSignatory.accountId,
      chain.chainId,
      chain.assets.at(0)!.assetId.toString(),
    );

    if (new BN(proxyDeposit).gte(withdrawableAmountBN(multisigBalance))) {
      errors.push({ errorText: 'proxy.addProxy.balanceAlertMultisig', name: 'proxy.addProxy.balanceAlertTitle' });
    }
    if (multisigDeposit.add(fee).gte(withdrawableAmountBN(signerBalance))) {
      errors.push({ errorText: 'proxy.addProxy.notEnoughMultisigTokens', name: 'proxy.addProxy.balanceAlertTitle' });
    }

    return errors;
  },
);

// Signing
const sign = createEvent();

sample({
  clock: sign,
  source: {
    transactions: $wrappedTx,
    chain: $chain,
    signatory: $selectedSignatory,
    account: $multisigAccount,
  },
  filter: ({ chain, account, transactions }) => {
    return nonNullable(account) && nonNullable(chain) && nonNullable(transactions);
  },
  fn: ({ chain, account, signatory, transactions }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: account!,
          signatory,
          transaction: transactions!.wrappedTx,
        },
      ],
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    transactions: $wrappedTx,
    account: $multisigAccount,
    chain: $chain,
    signatory: $selectedSignatory,
  },
  filter: ({ transactions, account, chain }) => {
    return nonNullable(chain) && nonNullable(transactions) && nonNullable(account);
  },
  fn({ transactions, account, chain, signatory }, signParams) {
    return {
      event: {
        ...signParams,
        chain: chain!,
        account: account!,
        signatory: signatory,
        wrappedTxs: [transactions!.wrappedTx],
        coreTxs: [transactions!.coreTx],
        multisigTxs: transactions!.multisigTx ? [transactions!.multisigTx] : [],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  filter: (results) => submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $wallet,
  filter: (wallet, results) => {
    return nonNullable(wallet) && submitUtils.isSuccessResult(results[0].result);
  },
  fn: (wallet) => wallet!,
  target: multisigsModel.convertMultisigToFlexible,
});

sample({
  clock: flow.close,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: flow.close,
  source: $wallet,
  filter: nonNullable,
  target: balanceSubModel.events.walletToUnsubSet,
});
sample({
  clock: flow.close,
  source: $signatoriesWallets,
  target: series(balanceSubModel.events.walletToUnsubSet),
});

sample({
  clock: flow.close,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const convertToFlexibleModel = {
  $step,
  $chain,
  $signatories,
  $selectedSignatory,
  $multisigAccount,
  $wallet,

  $errors,
  $proxyDeposit,
  $multisigDeposit,
  $fee,
  $isFeeLoading: $pendingFee,

  stepChanged,
  selectSigner,
  sign,

  flow,
};
