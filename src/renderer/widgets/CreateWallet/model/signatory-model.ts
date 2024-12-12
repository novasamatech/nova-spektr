import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';

import { type Address, type Wallet } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { type SignatoryInfo } from '../lib/types';

const addSignatory = createEvent<Omit<SignatoryInfo, 'index'>>();
const changeSignatory = createEvent<SignatoryInfo>();
const deleteSignatory = createEvent<number>();
const getSignatoriesBalance = createEvent<Wallet[]>();
const resetSignatories = createEvent();

const $signatories = createStore<Omit<SignatoryInfo, 'index'>[]>([{ name: '', address: '', walletId: '' }]);

const $duplicateSignatories = combine($signatories, (signatories) => {
  const duplicates: Record<Address, number[]> = {};

  for (const [index, signer] of signatories.entries()) {
    if (!signer.address) continue;

    if (duplicates[signer.address]) {
      duplicates[signer.address].push(index);
    } else {
      duplicates[signer.address] = [];
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

const $hasEmptySignatoryName = $signatories.map((signatories) => {
  return signatories.some(({ name }) => !name.trim());
});

const $ownedSignatoriesWallets = combine(
  {
    wallets: walletModel.$wallets,
    signatories: $signatories,
  },
  ({ wallets, signatories }) => {
    const matchWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isValidSignatory(w),
      accountFn: (a) => signatories.some((s) => toAccountId(s.address) === a.accountId),
    });

    return matchWallets || [];
  },
);

const populateBalanceFx = createEffect((wallets: Wallet[]) => {
  for (const wallet of wallets) {
    balanceSubModel.events.walletToSubSet(wallet);
  }
});

sample({
  clock: getSignatoriesBalance,
  target: populateBalanceFx,
});

sample({
  clock: addSignatory,
  source: $signatories,
  fn: (signatories, { name, address, walletId }) => {
    return produce(signatories, (draft) => {
      draft.push({ name, address, walletId });
    });
  },
  target: $signatories,
});

sample({
  clock: changeSignatory,
  source: $signatories,
  fn: (signatories, { index, name, address, walletId }) => {
    return produce(signatories, (draft) => {
      if (index >= draft.length) {
        draft.push({ name, address, walletId });
      } else {
        draft[index] = { name, address, walletId };
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
  $ownedSignatoriesWallets,
  $duplicateSignatories,
  $hasEmptySignatories,
  $hasEmptySignatoryName,
  $hasDuplicateSignatories,

  events: {
    addSignatory,
    changeSignatory,
    deleteSignatory,
    getSignatoriesBalance,
    resetSignatories,
  },
};
