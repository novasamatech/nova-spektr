import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Asset, type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { defaultDateFormatter } from '../lib/labels';
import { type RewardBucket } from '../lib/types';

import { RewardsChartTooltip } from './RewardsChartTooltip';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: () => null,
  ChainIcon: () => null,
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: AccountId }) => <span data-testid="account">{accountId}</span>,
}));

vi.mock('@/widgets/price', () => ({
  AssetFiatBalance: () => null,
}));

const asset = { assetId: 0, symbol: 'DOT', precision: 10, name: 'Polkadot' } as unknown as Asset;
const chain = { chainId: '0x00', name: 'Polkadot', addressPrefix: 0, assets: [] } as unknown as Chain;

const bucketOf = (accountCount: number): RewardBucket => ({
  start: Date.UTC(2026, 6, 20),
  end: Date.UTC(2026, 6, 21),
  granularity: 'day',
  total: '1000',
  accounts: Array.from({ length: accountCount }, (_, index) => ({
    accountId: `0x${String(index).padStart(64, '0')}`,
    amount: '100',
    share: 1 / accountCount,
  })),
});

const renderTooltip = (accountCount: number) =>
  render(
    <RewardsChartTooltip
      bucket={bucketOf(accountCount)}
      chain={chain}
      asset={asset}
      color="#e6007a"
      era={null}
      walletByAccountId={new Map()}
      formatDate={defaultDateFormatter}
    />,
  );

describe('RewardsChartTooltip', () => {
  it('lists every account while they fit the card', () => {
    renderTooltip(4);

    expect(screen.getAllByTestId('account')).toHaveLength(4);
    expect(screen.queryByText(/moreAccounts/)).not.toBeInTheDocument();
  });

  it('names the remainder instead of dropping it silently', () => {
    renderTooltip(10);

    expect(screen.getAllByTestId('account')).toHaveLength(6);
    expect(screen.getByText(/moreAccounts.*"count":4/)).toBeInTheDocument();
  });

  it('keeps the total line outside the part that gives way', () => {
    renderTooltip(10);

    const total = screen.getByText('dashboard.staking.rewardsChart.tooltip.total');
    const totalRow = total.parentElement;
    const accountList = screen.getAllByTestId('account')[0]?.closest('.overflow-hidden');

    expect(totalRow).toHaveClass('shrink-0');
    expect(accountList).not.toBeNull();
    expect(accountList?.contains(total)).toBe(false);
  });
});
