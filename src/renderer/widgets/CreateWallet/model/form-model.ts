import { combine, createEvent, sample } from 'effector';
import { createForm } from 'effector-forms';

import chains from '@/shared/config/chains/chains.json';
import { type Chain, CryptoType, type MultisigAccount, type Wallet } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type FormParams } from '../lib/types';

import { signatoryModel } from './signatory-model';

const restoreWallet = createEvent<Wallet>();

const $createMultisigForm = createForm<FormParams>({
  fields: {
    threshold: {
      init: 0,
      rules: [
        {
          name: 'moreOrEqualToTwo',
          validator: (threshold) => threshold >= 2,
        },
      ],
    },
    chain: {
      init: chains[0] as Chain,
    },
    name: {
      init: '',
      rules: [
        {
          name: 'notEmpty',
          validator: (name) => name !== '',
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $multisigAccountId = combine(
  {
    formValues: $createMultisigForm.$values,
    signatories: signatoryModel.$signatories,
  },
  ({ formValues: { threshold, chain }, signatories }) => {
    if (!threshold) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      Array.from(signatories.values()).map((s) => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

const $multisigAlreadyExists = combine(
  { wallets: walletModel.$wallets, multisigAccountId: $multisigAccountId, formValues: $createMultisigForm.$values },
  ({ multisigAccountId, wallets, formValues: { chain } }) =>
    !!walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isMultisig(w),
      accountFn: (multisigAccount) => {
        const isSameAccountId = multisigAccount.accountId === multisigAccountId;
        const chainId = (multisigAccount as MultisigAccount).chainId;
        const isSameChainId = !chainId || chainId === chain.chainId;

        return isSameAccountId && isSameChainId;
      },
    }),
);

const $hiddenMultisig = combine(
  {
    hiddenWallets: walletModel.$hiddenWallets,
    multisigAccountId: $multisigAccountId,
    formValues: $createMultisigForm.$values,
  },
  ({ multisigAccountId, hiddenWallets, formValues: { chain } }) =>
    walletUtils.getWalletFilteredAccounts(hiddenWallets, {
      walletFn: (w) => walletUtils.isMultisig(w),
      accountFn: (multisigAccount) => {
        const isSameAccountId = multisigAccount.accountId === multisigAccountId;
        const chainId = (multisigAccount as MultisigAccount).chainId;
        const isSameChainId = !chainId || chainId === chain.chainId;

        return isSameAccountId && isSameChainId;
      },
    }),
);

const $availableAccounts = combine(
  {
    wallets: walletModel.$wallets,
    formValues: $createMultisigForm.$values,
  },
  ({ formValues: { chain }, wallets }) => {
    if (!chain) return [];

    const filteredAccounts = walletUtils.getAccountsBy(wallets, (a, w) => {
      const isValidWallet = !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w) && !walletUtils.isMultisig(w);
      const isChainMatch = accountUtils.isChainAndCryptoMatch(a, chain);

      return isValidWallet && isChainMatch;
    });

    const baseAccounts = filteredAccounts.filter((a) => accountUtils.isBaseAccount(a) && a.name);

    return [...filteredAccounts, ...baseAccounts];
  },
);

sample({
  clock: signatoryModel.events.signatoryDeleted,
  target: $createMultisigForm.fields.threshold.reset,
});

sample({
  clock: restoreWallet,
  target: walletModel.events.walletRestored,
});

export const formModel = {
  $createMultisigForm,
  $multisigAccountId,
  $multisigAlreadyExists,
  $hiddenMultisig,
  $availableAccounts,
  output: {
    formSubmitted: $createMultisigForm.formValidated,
  },
};
