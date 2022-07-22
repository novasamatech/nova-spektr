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

  let i;
  // eslint-disable-next-line no-plusplus
  for (i = 0; i < min; i++) {
    if (a[i] !== b[i]) {
      break;
    }
  }

  return i;
};

const retrieveFromLeaf = (leaf: Node, key: Uint8Array) => {
  if (u8aToHex(leaf.key) === u8aToHex(key)) {
    return leaf.value;
  }

  return null;
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

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return retrieve(child, childKey);
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

/**
 * get the value for a given key from the trie
 * @param node root node of the trie
 * @param key key to retrieve
 * @returns value for the key as a Uint8Array
 */
export const get = (node: Node, key: Uint8Array): Uint8Array | null => {
  const keyNibbles = keyLEToNibbles(key);

  return retrieve(node, keyNibbles);
};
