import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type Chain } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { polkadotChain } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { OperationBlocked } from '../OperationBlocked';

const renderBlocked = (chain: Chain | null = polkadotChain) => {
  const onRetry = vi.fn();
  const onClose = vi.fn();

  render(
    <I18Provider>
      <ThemeProvider>
        <MemoryRouter>
          <OperationBlocked reason={{ kind: 'invalid-call-data' }} chain={chain} onRetry={onRetry} onClose={onClose} />
        </MemoryRouter>
      </ThemeProvider>
    </I18Provider>,
  );

  return { onRetry, onClose };
};

describe('OperationBlocked · invalid-call-data', () => {
  it('SP-38: says the operation data is not valid for the chain and offers nothing but Close', async () => {
    const { onRetry, onClose } = renderBlocked();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText("Operation data isn't valid")).toBeInTheDocument();
    expect(screen.getByText("The call data of this operation couldn't be decoded on Polkadot.")).toBeInTheDocument();

    // A single action: the call data cannot be retried into shape, and there
    // is nothing to sign.
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Close']);
    expect(screen.queryByRole('button', { name: /sign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('SP-38: falls back to a generic network name when the flow has no chain yet', () => {
    renderBlocked(null);

    expect(screen.getByText("Operation data isn't valid")).toBeInTheDocument();
    expect(
      screen.getByText("The call data of this operation couldn't be decoded on this network."),
    ).toBeInTheDocument();
  });
});
