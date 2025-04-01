import { createFeature } from '@/shared/feature';
import { transactionSDK } from '@/sdk/transaction';

import { decodeCallData } from './callDataDecoder';
import { getExtrinsic } from './extrinsicService';

export * as types from './typeCheck';

/**
 * This is temporary solution. Encoding and decoding should be splitted to
 * features.
 */
export const transactionDecoderFeature = createFeature({
  name: 'transaction/decoder',
});

transactionSDK(transactionDecoderFeature, {
  encode(transaction, { api }) {
    const key = `${transaction.section}.${transaction.method}`;
    return getExtrinsic[key]?.(transaction.args, api).method.toHex();
  },
  decode(extrinsic) {
    return decodeCallData(extrinsic);
  },
  wrap() {},
  unwrap() {},
});
