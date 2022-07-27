import { u8aToHex, hexToU8a } from '@polkadot/util';

import { buildTrie } from './decode';
import { get } from './retreive';

/**
 * Verify data from relay chain by proof and state root
 * Returns true if retrieved value is equal to value from relay chain
 * @param proof - proof from parachain
 * @param root - state root from relay chain
 * @param key - key to retrieve
 * @param value - value from relay chain
 * @return {Boolean}
 */
export const verify = (proof: Uint8Array[], root: Uint8Array, key: string, value: Uint8Array): boolean => {
  const rootNode = buildTrie(proof, root);

  const proofValue = get(rootNode, hexToU8a(key)) || new Uint8Array([0]);

  return u8aToHex(value) === u8aToHex(proofValue);
};
