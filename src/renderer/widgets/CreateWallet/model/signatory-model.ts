import { combine, createEvent, createStore, sample } from 'effector';

import { toAccountId } from '@shared/lib/utils';
import { walletModel, walletUtils } from '@entities/wallet';
import { type SignatoryInfo } from '../lib/types';

const signatoriesChanged = createEvent<SignatoryInfo>();
const signatoryDeleted = createEvent<number>();

const $signatories = createStore<Map<number, Omit<SignatoryInfo, 'index'>>>(new Map([[0, { name: '', address: '' }]]));

const $hasOwnSignatory = combine(
  { wallets: walletModel.$wallets, signatories: $signatories },
  ({ wallets, signatories }) =>
    !!walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => Array.from(signatories.values()).some((s) => toAccountId(s.address) === a.accountId),
    })?.length,
);

sample({
  clock: signatoriesChanged,
  source: $signatories,
  fn: (signatories, { index, name, address }) => {
    signatories.set(index, { name, address });

    // we need to return new Map to trigger re-render
    return new Map(signatories);
  },
  target: $signatories,
});

sample({
  clock: signatoryDeleted,
  source: $signatories,
  filter: (signatories, index) => signatories.has(index),
  fn: (signatories, index) => {
    signatories.delete(index);

    // we need to return new Map to trigger re-render
    return new Map(signatories);
  },
  target: $signatories,
});

export const signatoryModel = {
  $signatories,
  $hasOwnSignatory,
  events: {
    signatoriesChanged,
    signatoryDeleted,
  },
};
