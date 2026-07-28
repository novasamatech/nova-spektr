import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '@/domains/staking';

export const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

export const makeValidator = (index: number, overrides: Partial<EraValidator> = {}): EraValidator => ({
  accountId: accountId(index),
  totalStake: '1000',
  ownStake: '100',
  commission: 5,
  blocked: false,
  nominatorCount: 10,
  pageCount: 1,
  maxNominatorsRewarded: 512,
  slashed: false,
  eraPoints: 100,
  blocksAuthored: 10,
  apy: 10,
  elected: true,
  ...overrides,
});

export const ids = (validators: EraValidator[]) => validators.map((validator) => validator.accountId);
