import { combine, sample } from 'effector';
import { createForm } from 'effector-forms';

import { type Chain, type ChainId, CryptoType } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type FormParams } from '../lib/types';

import { signatoryModel } from './signatory-model';

const DEFAULT_CHAIN: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'; // Polkadot

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
    chainId: {
      init: DEFAULT_CHAIN,
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

const $chain = combine(
  {
    formValues: $createMultisigForm.$values,
    chains: networkModel.$chains,
  },
  ({ formValues, chains }): Chain | null => {
    return chains[formValues.chainId] ?? null;
  },
);

const $multisigAccountId = combine(
  {
    formValues: $createMultisigForm.$values,
    signatories: signatoryModel.$signatories,
    chain: $chain,
  },
  ({ formValues: { threshold }, signatories, chain }) => {
    if (!threshold || !chain) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      signatories.map((s) => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

const $multisigAlreadyExists = combine(
  {
    wallets: walletModel.$wallets,
    multisigAccountId: $multisigAccountId,
    formValues: $createMultisigForm.$values,
  },
  ({ multisigAccountId, wallets, formValues: { chainId } }) => {
    const multisigWallet = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: walletUtils.isMultisig,
      accountFn: (multisigAccount) => {
        if (!accountUtils.isMultisigAccount(multisigAccount)) return false;

        const isSameAccountId = multisigAccount.accountId === multisigAccountId;
        const isSameChainId = !multisigAccount.chainId || multisigAccount.chainId === chainId;

        return isSameAccountId && isSameChainId;
      },
    });

    return nonNullable(multisigWallet);
  },
);

const $hiddenMultisig = combine(
  {
    hiddenWallets: walletModel.$hiddenWallets,
    multisigAccountId: $multisigAccountId,
    formValues: $createMultisigForm.$values,
  },
  ({ multisigAccountId, hiddenWallets, formValues: { chainId } }) => {
    return walletUtils.getWalletFilteredAccounts(hiddenWallets, {
      walletFn: walletUtils.isMultisig,
      accountFn: (multisigAccount) => {
        if (!accountUtils.isMultisigAccount(multisigAccount)) return false;

        const isSameAccountId = multisigAccount.accountId === multisigAccountId;
        const isSameChainId = !multisigAccount.chainId || multisigAccount.chainId === chainId;

        return isSameAccountId && isSameChainId;
      },
    });
  },
);

const $availableAccounts = combine(
  {
    chain: $chain,
    wallets: walletModel.$wallets,
  },
  ({ chain, wallets }) => {
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
  clock: signatoryModel.events.deleteSignatory,
  target: $createMultisigForm.fields.threshold.reset,
});

sample({
  clock: $createMultisigForm.fields.chainId.changed,
  target: [$createMultisigForm.fields.threshold.reset, signatoryModel.events.resetSignatories],
});

export const formModel = {
  $chain,
  $createMultisigForm,
  $multisigAccountId,
  $multisigAlreadyExists,
  $hiddenMultisig,
  $availableAccounts,

  output: {
    formSubmitted: $createMultisigForm.formValidated,
  },
};
