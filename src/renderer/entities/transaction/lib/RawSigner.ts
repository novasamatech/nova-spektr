import type { Signer, SignerResult } from '@polkadot/api/types';

import type { HexString } from '@shared/core';

export class RawSigner implements Signer {
  signature: HexString;

  constructor(signature: HexString) {
    this.signature = signature;
  }

  async signRaw(data: any): Promise<SignerResult> {
    return { id: 1, signature: this.signature };
  }
}
