import { combine, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';

import { type Wallet } from '@/shared/core';
import { series } from '@/shared/effector';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { type SignatoryInfo } from '../../types';

const addSignatory = createEvent<Omit<SignatoryInfo, 'index'>>();
const changeSignatory = createEvent<SignatoryInfo>();
const deleteSignatory = createEvent<number>();
const getSignatoriesBalance = createEvent<Wallet[]>();
const resetSignatories = createEvent();

const $signatories = createStore<Omit<SignatoryInfo, 'index'>[]>([{ name: '', address: '', walletId: '' }]);
const $duplicateSignatories = combine($signatories, signatories => {
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

const $hasDuplicateSignatories = $duplicateSignatories.map(signatories => {
  return Object.values(signatories).some(duplicates => duplicates.length > 0);
});

const $hasEmptySignatories = $signatories.map(signatories => {
  return signatories.some(({ address }) => !address.trim());
});

const $hasEmptySignatoryName = $signatories.map(signatories => {
  return signatories.some(({ name }) => !name.trim());
});

const $ownedSignatoriesWallets = combine(
  {
    wallets: walletModel.$wallets,
    signatories: $signatories,
  },
  ({ wallets, signatories }) => {
    const matchWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: w => !walletUtils.isWatchOnly(w),
      accountFn: a => signatories.some(s => toAccountId(s.address) === a.accountId),
    });

    return matchWallets || [];
  },
);

sample({
  clock: getSignatoriesBalance,
  target: series(balanceSubModel.fetchWallet),
});

sample({
  clock: addSignatory,
  source: $signatories,
  fn: (signatories, { name, address, walletId }) => {
    return produce(signatories, draft => {
      draft.push({ name, address, walletId });
    });
  },
  target: $signatories,
});

sample({
  clock: changeSignatory,
  source: $signatories,
  fn: (signatories, { index, name, address, walletId }) => {
    return produce(signatories, draft => {
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
    return produce(signatories, draft => {
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
  $hasDuplicateSignatories,
  $hasEmptySignatories,
  $hasEmptySignatoryName,
  events: {
    addSignatory,
    changeSignatory,
    deleteSignatory,
    getSignatoriesBalance,
    resetSignatories,
  },
};
