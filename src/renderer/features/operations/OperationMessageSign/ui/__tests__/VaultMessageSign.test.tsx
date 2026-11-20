import { stringToHex, u8aToHex } from '@polkadot/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
import { type MessageSigningPayload } from '../../lib/types';
import { VaultMessageSign } from '../VaultMessageSign';

// The camera and the QR canvas are not available in jsdom; the QR stand-in exposes
// the payload it was given so the test can compare it with the text on screen.
vi.mock('@/entities/transaction', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCameraAvailability: () => ({ status: 'available', retry: () => undefined }),
  QrTxGenerator: ({ payload }: { payload: Uint8Array }) => <div data-testid="qr" data-payload={u8aToHex(payload)} />,
  QrSignatureReader: () => <div data-testid="signature-reader" />,
}));

const MESSAGE = `<Bytes>ADDRESS_BOOK_AUTH v2\norigin: https://ab.example.com\nnonce: 0x${'ab'.repeat(32)}</Bytes>`;

const payload: MessageSigningPayload = {
  message: new TextEncoder().encode(MESSAGE),
  signatory: createVaultBaseAccount('vault', { walletId: 1 }),
  chainId: polkadotChain.chainId,
};

const renderVaultSign = () => {
  render(
    <I18Provider>
      <VaultMessageSign payload={payload} onGoBack={vi.fn()} onResult={vi.fn()} />
    </I18Provider>,
  );
};

describe('VaultMessageSign', () => {
  it('shows the complete message next to the QR code that carries it', () => {
    renderVaultSign();

    expect(screen.getByText('Message to sign')).toBeInTheDocument();

    const message = screen.getByTestId('message-to-sign');
    expect(message.tagName).toBe('PRE');
    // Exact text, line breaks included.
    expect(message.textContent).toBe(MESSAGE);
    expect(message.textContent?.split('\n')).toEqual([
      '<Bytes>ADDRESS_BOOK_AUTH v2',
      'origin: https://ab.example.com',
      `nonce: 0x${'ab'.repeat(32)}</Bytes>`,
    ]);
    expect(message).toHaveClass('font-mono', 'whitespace-pre-wrap');

    // The QR payload holds the very bytes that are displayed.
    const qrPayload = screen.getByTestId('qr').getAttribute('data-payload');
    expect(qrPayload).toContain(stringToHex(message.textContent ?? '').slice(2));
  });

  it('has shown the message before the signature scan step is reached', () => {
    renderVaultSign();

    expect(screen.getByTestId('message-to-sign')).toBeInTheDocument();
    expect(screen.queryByTestId('signature-reader')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByTestId('signature-reader')).toBeInTheDocument();
  });
});
