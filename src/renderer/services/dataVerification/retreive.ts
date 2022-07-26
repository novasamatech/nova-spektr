/* eslint-disable no-bitwise */
import { u8aToHex } from '@polkadot/util';

import { Node } from './types';
import { NodeType } from './constants';
import { getNodeType, keyLEToNibbles } from './utils';

// lenCommonPrefix returns the length of the
// common prefix between two byte slices.
const lenCommonPrefix = (a: Uint8Array, b: Uint8Array): number => {
  let min = a.length;
  if (b.length < min) {
    min = b.length;
  }

  let index;
  // eslint-disable-next-line no-plusplus
  for (index = 0; index < min; index++) {
    if (a[index] !== b[index]) {
      break;
    }
  }

  return index;
};

const retrieveFromLeaf = (leaf: Node, key: Uint8Array) => {
  if (u8aToHex(leaf.key) === u8aToHex(key)) {
    return leaf.value;
  }

  return null;
};

const retrieve = (node: Node, key: Uint8Array): Uint8Array | null => {
  if (!node) {
    return null;
  }

  if (getNodeType(node) === NodeType.Leaf) {
    return retrieveFromLeaf(node, key);
  }

  return retrieveFromBranch(node, key);
};

const retrieveFromBranch = (branch: Node, key: Uint8Array) => {
  if (key.length === 0 || u8aToHex(branch.key) === u8aToHex(key)) {
    return branch.value;
  }

  if (branch.key.length > key.length && u8aToHex(branch.key.subarray(0, key.length)) === u8aToHex(key)) {
    return null;
  }

  const commonPrefixLength = lenCommonPrefix(branch.key, key);
  const childIndex = key[commonPrefixLength];
  const childKey = key.subarray(commonPrefixLength + 1);
  const child = branch.children[childIndex];

  return retrieve(child, childKey);
};

/**
 * Get the value for a given key from the trie as Uint8Array
 * @param node root node of the trie
 * @param key key to retrieve
 * @return {Array}
 */
export const get = (node: Node, key: Uint8Array): Uint8Array | null => {
  const keyNibbles = keyLEToNibbles(key);

  return retrieve(node, keyNibbles);
};
