const SIGNING_CONTEXT = 'ADDRESS_BOOK_AUTH';
const ORIGIN_BOUND_MESSAGE_VERSION = 2;

type SignMessageParams = {
  /**
   * Backend URL from the app's own configuration — its origin goes into the v2
   * message.
   */
  backendUrl: string;
  nonce: string;
  /**
   * Advertised by the backend in the challenge; absent on backends that only
   * verify v1.
   */
  messageVersion?: number;
};

/**
 * Sign-in message for the address-book backend. v2 names the backend origin so
 * the signature is only valid for the backend the user configured; the backend
 * (`auth/crypto.util.ts`) and its admin portal build the same text. A version
 * this client does not know gets the v1 text, which the backend still verifies
 * under its legacy flag, instead of a v2 text passed off as the newer version.
 */
export function buildSignMessage({ backendUrl, nonce, messageVersion }: SignMessageParams): string {
  if (messageVersion === ORIGIN_BOUND_MESSAGE_VERSION) {
    const origin = new URL(backendUrl).origin;

    return `<Bytes>${SIGNING_CONTEXT} v${ORIGIN_BOUND_MESSAGE_VERSION}\norigin: ${origin}\nnonce: ${nonce}</Bytes>`;
  }

  return `<Bytes>${SIGNING_CONTEXT}:${nonce}</Bytes>`;
}
