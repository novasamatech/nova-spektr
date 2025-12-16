import { combine, sample } from 'effector';

import { type Chain, type ChainId, CryptoType } from '@/shared/core';
import { createForm } from '@/shared/forms';
import { nonNullable, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

import { signatoryModel } from './signatory-model';

const MIN_THRESHOLD = 2;
export const DEFAULT_SUBSTRATE_CHAIN: ChainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f'; // Polkadot AH
export const DEFAULT_EVM_CHAIN: ChainId = '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9'; // Mythos

export type FormParams = {
  threshold: number;
  chainId: ChainId;
  name: string;
};

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
      defaultValue: DEFAULT_SUBSTRATE_CHAIN,
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

const $isChainConnected = combine(
  {
    chainId: form.fields.chainId.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    return networkUtils.isConnectedStatus(statuses[chainId]);
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

const $existingMultisig = combine(
  {
    accounts: accounts.$list,
    multisigAccountId: $multisigAccountId,
  },
  ({ multisigAccountId, accounts }) => {
    if (nullable(multisigAccountId)) return null;

    return accounts.find(a => a.accountId === multisigAccountId && accountUtils.isMultisigAccount(a)) ?? null;
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

const $invalidAddresses = combine(
  {
    chain: $chain,
    signatories: signatoryModel.$signatories,
    accounts: accounts.$list,
  },
  ({ chain, signatories, accounts }) => {
    if (!chain) return [];

    const badSignatories = new Set<string>();
    for (const signer of signatories) {
      const account = accounts.find(
        a => a.accountId === toAccountId(signer.address) && a.walletId.toString() === signer.walletId,
      );

      if (
        !signer.address ||
        validateAddress(signer.address, chain) ||
        (account && accountService.isAccountAvailableOnChain(account, chain))
      )
        continue;

      badSignatories.add(signer.address);
    }

    return Array.from(badSignatories);
  },
);

const $canSubmit = combine(
  {
    hasEmptySignatories: signatoryModel.$hasEmptySignatories,
    hasEmptySignatoryName: signatoryModel.$hasEmptySignatoryName,
    hasDuplicateSignatories: signatoryModel.$hasDuplicateSignatories,
    multisigAlreadyExists: $existingMultisig.map(nonNullable),
    invalidAddresses: $invalidAddresses,
    hiddenMultisig: $hiddenMultisig,
    threshold: form.fields.threshold.$value,
    name: form.fields.name.$value,
    isChainConnected: $isChainConnected,
  },
  ({ invalidAddresses, threshold, isChainConnected, name, ...params }) => {
    if (invalidAddresses.length > 0 || threshold < MIN_THRESHOLD || !isChainConnected || name.trim() === '')
      return false;

    return Object.values(params).every(param => nullable(param) || !param);
  },
);

sample({
  clock: signatoryModel.events.deleteSignatory,
  target: form.fields.threshold.reset,
});

sample({
  clock: form.fields.chainId.change,
  source: $chain,
  filter: nonNullable,
  fn: chain => chain!,
  target: signatoryModel.events.validateSignatories,
});

export const formModel = {
  $chain,
  form,
  $multisigAccountId,
  $multisigAlreadyExists: $existingMultisig.map(nonNullable),
  $hiddenMultisig,
  $invalidAddresses,
  $canSubmit,
  $isChainConnected,
  $existingMultisig,

  formSubmitted: form.submit,
};
