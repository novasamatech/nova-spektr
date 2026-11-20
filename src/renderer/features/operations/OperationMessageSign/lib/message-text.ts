import { u8aToHex } from '@polkadot/util';

/**
 * Text of a message exactly as the signer receives it. Bytes that are not valid
 * UTF-8 have no faithful text form, so they are shown as hex instead of a lossy
 * decoding.
 */
export function getMessageText(message: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(message);
  } catch {
    return u8aToHex(message);
  }
}
