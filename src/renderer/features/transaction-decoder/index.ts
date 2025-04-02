import { createFeature } from '@/shared/feature';
import { transactionSDK } from '@/sdk/transaction';

import { decodeCallData } from './callDataDecoder';
import { getExtrinsic } from './extrinsicService';

/**
 * This is temporary solution. Encoding and decoding should be splitted.
 */
export const transactionDecoderFeature = createFeature({
  name: 'transaction/decoder',
});

transactionSDK(transactionDecoderFeature, {
  encode(transaction, { api }) {
    const key = `${transaction.section}.${transaction.method}`;
    return getExtrinsic[key]?.(transaction.args, api).method.toHex();
  },
  decode(extrinsic, { api }) {
    return decodeCallData(extrinsic, api.genesisHash.toHex());
  },
  wrap() {},
  unwrap() {},
});
