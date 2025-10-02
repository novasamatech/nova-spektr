import { combine, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';

import { type Wallet } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceSubModel } from '@/features/assets-balances';
import { type SignatoryInfo } from '../types';

const addSignatory = createEvent<Omit<SignatoryInfo, 'index'>>();
const changeSignatory = createEvent<SignatoryInfo>();
const populateSignatories = createEvent<SignatoryInfo[]>();
const deleteSignatory = createEvent<number>();
const getSignatoriesBalance = createEvent<Wallet>();
const resetSignatories = createEvent();

const $signatories = createStore<Omit<SignatoryInfo, 'index'>[]>([{ address: '', walletId: '' }]);
const $duplicateSignatories = combine($signatories, (signatories) => {
  const duplicates: Record<AccountId, number[]> = {};

  for (const [index, signer] of signatories.entries()) {
    if (!signer.address) continue;
    const accountId = toAccountId(signer.address);

    if (duplicates[accountId]) {
      duplicates[accountId].push(index);
    } else {
      duplicates[accountId] = [];
    }
  }

  return duplicates;
});

const $hasDuplicateSignatories = $duplicateSignatories.map((signatories) => {
  return Object.values(signatories).some((duplicates) => duplicates.length > 0);
});

const $hasEmptySignatories = $signatories.map((signatories) => {
  return signatories.some(({ address }) => !address.trim());
});

sample({
  clock: getSignatoriesBalance,
  target: balanceSubModel.fetchWallet,
});

sample({
  clock: populateSignatories,
  target: $signatories,
});

sample({
  clock: addSignatory,
  source: $signatories,
  fn: (signatories, { address, walletId }) => {
    return produce(signatories, (draft) => {
      draft.push({ address, walletId });
    });
  },
  target: $signatories,
});

sample({
  clock: changeSignatory,
  source: $signatories,
  fn: (signatories, { index, address, walletId }) => {
    return produce(signatories, (draft) => {
      if (index >= draft.length) {
        draft.push({ address, walletId });
      } else {
        draft[index] = { address, walletId };
      }
    });
  },
  target: $signatories,
});

sample({
  clock: deleteSignatory,
  source: $signatories,
  filter: (signatories, index) => signatories.length > index,
  fn: (signatories, index) => {
    return produce(signatories, (draft) => {
      draft.splice(index, 1);
    });
  },
  target: $signatories,
});

sample({
  clock: resetSignatories,
  target: $signatories.reinit,
});

export const signatoryModel = {
  $signatories,
  $duplicateSignatories,
  $hasDuplicateSignatories,
  $hasEmptySignatories,

  addSignatory,
  changeSignatory,
  deleteSignatory,
  getSignatoriesBalance,
  resetSignatories,
  populateSignatories,
};
