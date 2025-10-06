import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type Chain, CryptoType } from '@/shared/core';
import { addUnique, getNativeAsset, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';

import { signatoryModel } from './signatory-model';

const thresholdChanged = createEvent<number | null>();
const populateForm = createEvent<Chain>();
const resetForm = createEvent();
const formSubmit = createEvent();

const $chain = createStore<Chain | null>(null).reset(resetForm);

const $threshold = restore(thresholdChanged, null).reset(resetForm);

sample({
  clock: populateForm,
  target: $chain,
});

const $asset = $chain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));

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

const $newMultisigAccountId = combine(
  {
    threshold: $threshold,
    signatories: signatoryModel.$signatories,
    chain: $chain,
  },
  ({ threshold, signatories, chain }) => {
    if (!chain || !threshold) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      Array.from(signatories).map((s) => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

const $invalidAddresses = combine(
  {
    chain: $chain,
    signatories: signatoryModel.$signatories,
  },
  ({ chain, signatories }) => {
    if (!chain) return [];

    let badSignatories: string[] = [];

    for (const signer of signatories) {
      if (!signer.address || validateAddress(signer.address, chain)) continue;

      badSignatories = addUnique(badSignatories, signer.address);
    }

    return badSignatories;
  },
);

const $isMultisigExists = combine(
  {
    accounts: accounts.$list,
    multisigAccountId: $newMultisigAccountId,
  },
  ({ multisigAccountId, accounts }) => {
    if (nullable(multisigAccountId)) return false;

    return accounts.some(
      (a) => accountUtils.isAnyMultisigAccount(a) && multisigService.getMultisigAccountId(a) === multisigAccountId,
    );
  },
);

export const formModel = {
  $api,
  $invalidAddresses,
  $isMultisigExists,
  $chain,

  $threshold,
  $newMultisigAccountId,
  $asset,

  resetForm,
  populateForm,
  thresholdChanged,
  formSubmit,
};
