import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createProxiedAccount, createVaultBaseAccount, polkadotAssetHubChain } from '@/shared/mocks';

import { SigningPathSection } from './SigningPathSection';

vi.mock('./SigningPathInline', () => ({
  SigningPathInline: ({ path }: { path: { accountId: string }[] }) => <div data-testid="inline">{path.length}</div>,
}));

const asset = polkadotAssetHubChain.assets[0]!;
const common = { chain: polkadotAssetHubChain, asset, txErrors: [], onChange: () => {} };

describe('SigningPathSection', () => {
  it('renders nothing for a direct signer without a direct initiator to show', () => {
    render(<SigningPathSection {...common} signingPath={[]} />);
    expect(screen.queryByTestId('inline')).toBeNull();
  });

  it('shows the initiator card for a plain account signing directly', () => {
    render(
      <SigningPathSection
        {...common}
        signingPath={[]}
        directInitiator={createVaultBaseAccount('stash', { walletId: 1 })}
      />,
    );
    expect(screen.getByTestId('inline')).toHaveTextContent('1');
  });

  it('hides a delegating initiator whose route is not seeded yet', () => {
    render(<SigningPathSection {...common} signingPath={[]} directInitiator={createProxiedAccount('proxied')} />);
    expect(screen.queryByTestId('inline')).toBeNull();
  });
});
