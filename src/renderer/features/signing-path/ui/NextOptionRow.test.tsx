import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { NextOptionRow } from './NextOptionRow';

vi.mock('@/shared/ui-entities', () => ({
  WalletAccountIcon: () => null,
  AssetBalance: () => null,
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'signingPath.label.thresholdRatio' && params) {
        return `${params['current']} of ${params['total']}`;
      }
      if (key === 'signingPath.label.multisig') return 'Multisig';
      return key;
    },
  }),
}));

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

describe('NextOptionRow', () => {
  it('fires onClick when the button is clicked', () => {
    const onClick = vi.fn();
    render(
      <NextOptionRow
        option={{ kind: 'signer', accountId: acc(1), name: 'Alice' }}
        selected={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders threshold for multisig option', () => {
    render(
      <NextOptionRow
        option={{
          kind: 'multisig',
          accountId: acc(2),
          name: 'Council',
          threshold: 3,
          signatoriesCount: 5,
        }}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/3 of 5/i)).toBeInTheDocument();
  });

  it('renders the option name', () => {
    render(
      <NextOptionRow
        option={{ kind: 'signer', accountId: acc(3), name: 'Alice Vault' }}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/alice vault/i)).toBeInTheDocument();
  });

  it('reflects selected state via aria-pressed', () => {
    render(
      <NextOptionRow option={{ kind: 'signer', accountId: acc(4), name: 'Bob' }} selected={true} onClick={() => {}} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
