import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { CryptoType, SigningType } from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ChainAccount } from '@/domains/network';
import { type NominatorInfo } from '../lib/types';

import { NominatorsList } from './NominatorsList';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const createAccount = (index: number): ChainAccount => ({
  id: `account-${index}`,
  type: 'chain',
  walletId: 1,
  name: `Account ${index}`,
  accountId: TEST_ACCOUNTS[index]!,
  chainId: polkadotAssetHubChain.chainId,
  signingType: SigningType.WATCH_ONLY,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
});

const createNominator = (index: number): NominatorInfo<ChainAccount> => ({
  account: createAccount(index),
  isSelected: index === 0,
  stash: TEST_ACCOUNTS[index] as AccountId,
  totalStake: '0',
  totalReward: '0',
  unlocking: [],
});

const defaultProps = {
  api: null,
  timelineApi: null,
  chain: polkadotAssetHubChain,
  asset: polkadotAssetHubChain.assets[0],
  era: 1,
  isStakingLoading: false,
  onCheckValidators: vi.fn(),
  onToggleNominator: vi.fn(),
};

describe('pages/Staking/ui/NominatorsList', () => {
  test('does not break hook order when wallet switch changes account row count', () => {
    const { rerender } = render(
      <NominatorsList {...defaultProps} nominators={[createNominator(0), createNominator(1), createNominator(2)]} />,
    );

    expect(() => {
      rerender(<NominatorsList {...defaultProps} nominators={[createNominator(0)]} />);
    }).not.toThrow();
  });
});
