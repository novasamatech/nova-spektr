import { combine, sample } from 'effector';
import { createForm } from 'effector-forms';

import { type Address, type Chain, type ChainId, CryptoType } from '@/shared/core';
import { addUnique, nonNullable, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type FormParams } from '../lib/types';

import { signatoryModel } from './signatory-model';

const MIN_THRESHOLD = 2;
const DEFAULT_CHAIN: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'; // Polkadot

const $createMultisigForm = createForm<FormParams>({
  fields: {
    name: {
      init: '',
      rules: [
        {
          name: 'notEmpty',
          validator: (name) => name !== '',
        },
      ],
    },
    chainId: {
      init: DEFAULT_CHAIN,
    },
    threshold: {
      init: 0,
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

    const baseAccounts = filteredAccounts.filter((a) => accountUtils.isVaultBaseAccount(a) && a.name);

    return [...filteredAccounts, ...baseAccounts];
  },
);

const $invalidAddresses = combine(
  {
    chain: $chain,
    signatories: signatoryModel.$signatories,
  },
  ({ chain, signatories }) => {
    if (!chain) return [];

    let badSignatories: Address[] = [];

    for (const signer of signatories) {
      if (!signer.address || validateAddress(signer.address, chain)) continue;

      badSignatories = addUnique(badSignatories, signer.address);
    }

    return badSignatories;
  },
);

const $canSubmit = combine(
  {
    hasEmptySignatories: signatoryModel.$hasEmptySignatories,
    hasEmptySignatoryName: signatoryModel.$hasEmptySignatoryName,
    hasDuplicateSignatories: signatoryModel.$hasDuplicateSignatories,
    multisigAlreadyExists: $multisigAlreadyExists,
    invalidAddresses: $invalidAddresses,
    hiddenMultisig: $hiddenMultisig,
    threshold: $createMultisigForm.fields.threshold.$value,
  },
  ({ invalidAddresses, threshold, ...params }) => {
    if (invalidAddresses.length > 0 || threshold < MIN_THRESHOLD) return false;

    return Object.values(params).every((param) => nullable(param) || !param);
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
  $invalidAddresses,
  $canSubmit,

  output: {
    formSubmitted: $createMultisigForm.formValidated,
  },
};
