import { SIGN_IN_MESSAGE_VERSION } from '@/domains/backend';

const SIGNING_CONTEXT = 'ADDRESS_BOOK_AUTH';

type SignMessageParams = {
  /**
   * Backend URL from the app's own configuration — its origin goes into the
   * message.
   */
  backendUrl: string;
  nonce: string;
};

/**
 * Sign-in message for the address-book backend. It names the backend origin so
 * the signature is only valid for the backend the user configured; the backend
 * (`auth/crypto.util.ts`) and its admin portal build the same text. This is the
 * only text the app signs: a challenge that does not advertise this format is
 * refused by the challenge request (`domains/backend`) and never gets here.
 */
export function buildSignMessage({ backendUrl, nonce }: SignMessageParams): string {
  const origin = new URL(backendUrl).origin;

  return `<Bytes>${SIGNING_CONTEXT} v${SIGN_IN_MESSAGE_VERSION}\norigin: ${origin}\nnonce: ${nonce}</Bytes>`;
}
