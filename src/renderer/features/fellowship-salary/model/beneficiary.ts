import { createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type AccountId } from '@/shared/polkadotjs-schemas';

export const beneficiaryChanged = createEvent<AccountId | null>();

export const $beneficiary = createStore<AccountId | null>(null);

sample({
  clock: beneficiaryChanged,
  target: $beneficiary,
});

persist({
  store: $beneficiary,
  key: 'fellowship-salary-beneficiary',
});
