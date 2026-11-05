import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { dotAsset as asset } from '@/shared/mocks';

import { RewardAmount } from './RewardAmount';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: ({ value }: { value: string }) => <span data-testid="reward-amount">{value}</span>,
}));

vi.mock('@/widgets/price', () => ({
  AssetFiatBalance: () => null,
}));

const UNKNOWN = 'staking.overview.rewardsUnavailable';

describe('pages/Staking/ui/RewardAmount', () => {
  test('should show the amount of a complete answer', () => {
    render(<RewardAmount amount="500" asset={asset} completeness="complete" />);

    expect(screen.getByTestId('reward-amount')).toHaveTextContent('500');
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
  });

  test('should show a zero only when the answer is complete', () => {
    render(<RewardAmount amount="0" asset={asset} completeness="complete" />);

    expect(screen.getByTestId('reward-amount')).toHaveTextContent('0');
  });

  test('should say the rewards could not be loaded instead of showing zero', () => {
    render(<RewardAmount amount="0" asset={asset} completeness="unavailable" />);

    expect(screen.getByText(UNKNOWN)).toBeInTheDocument();
    expect(screen.queryByTestId('reward-amount')).not.toBeInTheDocument();
  });

  test('should not show a zero found by an answer that is missing a source', () => {
    render(<RewardAmount amount="0" asset={asset} completeness="partial" />);

    expect(screen.getByText(UNKNOWN)).toBeInTheDocument();
    expect(screen.queryByTestId('reward-amount')).not.toBeInTheDocument();
  });

  test('should keep what an answer missing a source did find', () => {
    render(<RewardAmount amount="500" asset={asset} completeness="partial" />);

    expect(screen.getByTestId('reward-amount')).toHaveTextContent('500');
  });

  test('should keep loading while nothing has answered yet', () => {
    render(<RewardAmount amount={undefined} asset={asset} completeness={undefined} />);

    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
    expect(screen.queryByTestId('reward-amount')).not.toBeInTheDocument();
  });
});
