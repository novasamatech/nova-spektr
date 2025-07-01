import { combine, sample } from 'effector';

import { type Address, type Chain, type ChainId, CryptoType } from '@/shared/core';
import { createForm } from '@/shared/forms';
import { addUnique, nonNullable, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type FormParams } from '../lib/types';

import { signatoryModel } from './signatory-model';

const MIN_THRESHOLD = 2;
const DEFAULT_CHAIN: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'; // Polkadot

const form = createForm<FormParams>({
  fields: {
    name: {
      defaultValue: '',
      validator: () => (value: string) => {
        if (value.trim() === '') {
          return { message: 'createMultisigAccount.disabledError.emptyName' };
        }
      },
    },
    chainId: {
      defaultValue: DEFAULT_CHAIN,
    },
    threshold: {
      defaultValue: 0,
    },
  },
  validateOn: ['submit'],
});

const $chain = combine(
  {
    chainId: form.fields.chainId.$value,

    chains: networkModel.$chains,
  },
  ({ chainId, chains }): Chain | null => {
    return chains[chainId] ?? null;
  },
);

const $multisigAccountId = combine(
  {
    threshold: form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: $chain,
  },
  ({ threshold, signatories, chain }) => {
    if (!chain) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      signatories.map(s => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

const $multisigAlreadyExists = combine(
  {
    wallets: walletModel.$wallets,
    multisigAccountId: $multisigAccountId,
  },
  ({ multisigAccountId, wallets }) => {
    const multisigWallet = walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: walletUtils.isMultisig,
      accountFn: multisigAccount => {
        if (!accountUtils.isMultisigAccount(multisigAccount)) return false;
        return multisigAccount.accountId === multisigAccountId;
      },
    });

    return nonNullable(multisigWallet);
  },
);

const $hiddenMultisig = combine(
  {
    hiddenWallets: walletModel.$hiddenWallets,
    multisigAccountId: $multisigAccountId,
  },
  ({ multisigAccountId, hiddenWallets }) => {
    return walletUtils.getWalletFilteredAccounts(hiddenWallets, {
      walletFn: walletUtils.isMultisig,
      accountFn: multisigAccount => {
        if (!accountUtils.isMultisigAccount(multisigAccount)) return false;
        return multisigAccount.accountId === multisigAccountId;
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
      const isChainMatch = accountService.isAccountAvailableOnChain(a, chain);

      return isValidWallet && isChainMatch;
    });

    const baseAccounts = filteredAccounts.filter(a => accountUtils.isVaultBaseAccount(a) && a.name);

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
    threshold: form.fields.threshold.$value,
    name: form.fields.name.$value,
  },
  ({ invalidAddresses, threshold, name, ...params }) => {
    if (invalidAddresses.length > 0 || threshold < MIN_THRESHOLD || name.trim() === '') return false;

    return Object.values(params).every(param => nullable(param) || !param);
  },
);

sample({
  clock: signatoryModel.events.deleteSignatory,
  target: form.fields.threshold.reset,
});

sample({
  clock: form.fields.chainId.change,
  target: [form.fields.threshold.reset, signatoryModel.events.resetSignatories],
});

export const formModel = {
  $chain,
  form,
  $multisigAccountId,
  $multisigAlreadyExists,
  $hiddenMultisig,
  $availableAccounts,
  $invalidAddresses,
  $canSubmit,

  formSubmitted: form.submit,
};
