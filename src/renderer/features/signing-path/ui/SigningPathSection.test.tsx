import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createAccountId, polkadotAssetHubChain } from '@/shared/mocks';

vi.mock('./SigningPathInline', () => ({
  SigningPathInline: ({ path }: { path: { accountId: string }[] }) => <div data-testid="inline">{path.length}</div>,
}));

const { SigningPathSection } = await import('./SigningPathSection');

const asset = polkadotAssetHubChain.assets[0]!;
const common = { chain: polkadotAssetHubChain, asset, txErrors: [], onChange: () => {} };

describe('SigningPathSection', () => {
  it('renders nothing for a direct signer without a direct initiator to show', () => {
    render(<SigningPathSection {...common} signingPath={[]} />);
    expect(screen.queryByTestId('inline')).toBeNull();
  });

  it('shows the initiator card for a direct signer when asked to', () => {
    render(<SigningPathSection {...common} signingPath={[]} directInitiatorAccountId={createAccountId('stash')} />);
    expect(screen.getByTestId('inline')).toHaveTextContent('1');
  });
});
