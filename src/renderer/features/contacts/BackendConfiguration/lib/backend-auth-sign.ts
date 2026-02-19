import { u8aToHex } from '@polkadot/util';
import { getWalletBySource } from '@talismn/connect-wallets';

import { toAddress } from '@/shared/lib/utils';

export function buildSignMessage(nonce: string): string {
  return `<Bytes>ADDRESS_BOOK_AUTH:${nonce}</Bytes>`;
}

export async function signChallenge(extensionSource: string, accountId: string, nonce: string): Promise<string> {
  const wallet = getWalletBySource(extensionSource);
  if (!wallet) {
    throw new Error(`Wallet ${extensionSource} not found`);
  }

  await wallet.enable('Nova Spektr');

  const signer = wallet.signer;
  if (!signer?.signRaw) {
    throw new Error(`Wallet ${extensionSource} does not support signRaw`);
  }

  const message = buildSignMessage(nonce);
  const encoder = new TextEncoder();
  const data = u8aToHex(encoder.encode(message));

  const result = await signer.signRaw({
    address: toAddress(accountId),
    data,
    type: 'bytes',
  });

  return result.signature;
}
