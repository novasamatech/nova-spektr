export function buildSignMessage(nonce: string): string {
  return `<Bytes>ADDRESS_BOOK_AUTH:${nonce}</Bytes>`;
}
