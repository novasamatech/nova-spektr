import { combine, createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { fellowshipSalaryFeature } from './feature';

const beneficiaryChanged = createEvent<AccountId | null>();

export const $beneficiary = createStore<AccountId | null>(null);

const $beneficiaryKey = combine(fellowshipSalaryFeature.input, input => {
  return `fellowship-salary-beneficiary-${input?.member?.accountId}-${input?.chainId}`;
});

const populateBeneficiaryFx = createEffect((key: string): AccountId | null => {
  return localStorageService.getFromStorage<AccountId | null>(key, null);
});

const saveBeneficiaryFx = createEffect(({ key, beneficiary }: { key: string; beneficiary: AccountId | null }) => {
  return localStorageService.saveToStorage<AccountId | null>(key, beneficiary);
});

sample({
  clock: beneficiaryChanged,
  target: $beneficiary,
});

sample({
  clock: $beneficiaryKey,
  target: populateBeneficiaryFx,
});

sample({
  clock: $beneficiary,
  source: $beneficiaryKey,
  filter: beneficiary => beneficiary !== null,
  fn: (key, beneficiary) => ({ key, beneficiary }),
  target: saveBeneficiaryFx,
});

sample({
  clock: populateBeneficiaryFx.doneData,
  target: $beneficiary,
});

export const beneficiary = {
  $beneficiary,
  change: beneficiaryChanged,
};
