import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { type Chain } from '@/shared/core';
import { dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type DataCompleteness } from '@/domains/staking';

import { NetworkInfo } from './NetworkInfo';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: ({ value }: { value: string }) => <span data-testid="total">{value}</span>,
  ChainSelect: () => null,
}));

vi.mock('@/widgets/price', () => ({
  AssetFiatBalance: () => null,
}));

const chain: Chain = { ...polkadotAssetHubChain, assets: [dotAsset] };

const UNAVAILABLE = 'staking.overview.rewardsUnavailable';
const INCOMPLETE = 'staking.overview.rewardsIncomplete';

const renderInfo = (rewardsCompleteness: DataCompleteness, rewards: string[] = ['300', '200']) =>
  render(
    <NetworkInfo
      chain={chain}
      rewards={rewards}
      rewardsCompleteness={rewardsCompleteness}
      isRewardsLoading={false}
      isStakingLoading={false}
      totalStakes={['1000']}
      onNetworkChange={() => {}}
    />,
  );

const totals = () => screen.getAllByTestId('total').map((node) => node.textContent);

describe('pages/Staking/ui/NetworkInfo · total rewards', () => {
  test('should show the plain total of a complete answer', () => {
    renderInfo('complete');

    expect(totals()).toEqual(['1000', '500']);
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  test('should mark the total as incomplete when a source did not answer', () => {
    renderInfo('partial');

    expect(totals()).toEqual(['1000', '500']);
    expect(screen.getByText(INCOMPLETE)).toBeInTheDocument();
  });

  test('should say the rewards could not be loaded instead of showing zero', () => {
    renderInfo('unavailable', ['0', '0']);

    // Only the staked total is left as a number.
    expect(totals()).toEqual(['1000']);
    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument();
  });
});
