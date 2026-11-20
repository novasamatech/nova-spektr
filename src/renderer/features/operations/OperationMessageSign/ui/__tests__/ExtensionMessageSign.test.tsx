import { hexToString } from '@polkadot/util';
import { render, screen, waitFor } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { describe, expect, it, vi } from 'vitest';

import { type HexString, CryptoType, SigningType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId } from '@/shared/mocks';
import { type UniversalAccount } from '@/domains/network';
import { type MessageSigningPayload } from '../../lib/types';
import { ExtensionMessageSign } from '../ExtensionMessageSign';

type SignRawRequest = { address: string; data: HexString; type: string };

// The extension never answers here: the request stays open, as it does while the
// user is looking at the extension's own prompt.
const { signRaw } = vi.hoisted(() => ({
  signRaw: vi.fn((_request: SignRawRequest) => new Promise<never>(() => undefined)),
}));

vi.mock('@talismn/connect-wallets', () => ({
  getWalletBySource: () => ({ enable: async () => undefined, signer: { signRaw } }),
}));

const MESSAGE = `<Bytes>ADDRESS_BOOK_AUTH v2\norigin: https://ab.example.com\nnonce: 0x${'ab'.repeat(32)}</Bytes>`;

type ExtensionSignerAccount = UniversalAccount & { accountType: 'extension'; extension: 'polkadot-js' };

const signatory: ExtensionSignerAccount = {
  id: 'extension-account',
  type: 'universal',
  accountType: 'extension',
  extension: 'polkadot-js',
  name: 'Extension Account',
  walletId: 7,
  accountId: createAccountId('extension-signer'),
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.EXTENSION,
  createdAt: 0,
};

const payload: MessageSigningPayload = { message: new TextEncoder().encode(MESSAGE), signatory };

describe('ExtensionMessageSign', () => {
  it('shows the complete message that is sent to the extension', async () => {
    render(
      <Provider value={fork()}>
        <I18Provider>
          <ExtensionMessageSign payload={payload} onGoBack={vi.fn()} onResult={vi.fn()} />
        </I18Provider>
      </Provider>,
    );

    expect(screen.getByText('Message to sign')).toBeInTheDocument();

    const message = screen.getByTestId('message-to-sign');
    expect(message.tagName).toBe('PRE');
    // Exact text, line breaks included.
    expect(message.textContent).toBe(MESSAGE);
    expect(message.textContent?.split('\n')).toHaveLength(3);
    expect(message).toHaveClass('font-mono', 'whitespace-pre-wrap');

    // The extension is asked to sign the very text that is displayed.
    await waitFor(() => expect(signRaw).toHaveBeenCalledTimes(1));
    expect(hexToString(signRaw.mock.calls[0]![0].data)).toBe(message.textContent);
  });
});
