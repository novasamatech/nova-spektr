/* eslint-disable no-bitwise */
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';

import {
  BRANCH_VARIANT,
  BRANCH_WITH_VALUE_VARIANT,
  HASH_LENGTH,
  HEADER_MASK,
  KEY_LENGTH_MASK,
  LEAF_VARIANT,
  NodeType,
  VARIANTS,
} from '../lib/constants';
import { type Node } from '../lib/types';
import { getNodeType, keyLEToNibbles } from '../lib/utils';

const decodeHeaderByte = (header: number) => {
  // variants is a slice of all variants sorted in ascending
  // order by the number of bits each variant mask occupy
  // in the header byte.
  // See https://spec.polkadot.network/#defn-node-header
  // Performance note: see `Benchmark_decodeHeaderByte`;
  // running with a locally scoped slice is as fast as having
  // it at global scope.

  // eslint-disable-next-line no-plusplus
  for (let index = VARIANTS.length - 1; index >= 0; index--) {
    const variantBits = header & HEADER_MASK;

    if (variantBits !== VARIANTS[index]) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const partialKeyLengthHeader = header & KEY_LENGTH_MASK;

    return [variantBits, partialKeyLengthHeader];
  }

  throw new Error('Invalid header byte');
};

const decodeHeader = (reader: Uint8Array): [number, number] => {
  let currentIndex = 0;
  const headerByte = reader[currentIndex];
  currentIndex = 1;
  const [variant, partialKeyLengthHeader] = decodeHeaderByte(headerByte);

  let partialKeyLength = partialKeyLengthHeader;

  if (partialKeyLengthHeader < KEY_LENGTH_MASK) {
    // partial key length is contained in the first byte.
    return [variant, partialKeyLength];
  }

  // the partial key length header byte is equal to its maximum
  // possible value; this means the partial key length is greater
  // than this (0 to 2^6 - 1 = 63) maximum value, and we need to
  // accumulate the next bytes from the reader to get the full
  // partial key length.
  // Specification: https://spec.polkadot.network/#defn-node-header

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const header = reader[currentIndex];
    currentIndex += 1;

    if (Number.isNaN(header) || header === undefined) {
      return [0, 0];
    }

    partialKeyLength += header;

    if (partialKeyLength > 65535) {
      // the partial key can have a length up to 65535 which is the
      // maximum uint16 value; therefore if we overflowed, we went over
      // this maximum.
      throw new Error('partial key length cannot be larger than 2^16');
    }

    if (header < 255) {
      // the end of the partial key length has been reached.
      return [variant, partialKeyLength];
    }
  }
};

const decodeKey = (reader: Uint8Array, keyLength: number): [Uint8Array, number] => {
  const keyLen = keyLength / 2 + (keyLength % 2);
  const key = reader.subarray(0, keyLen);

  return [keyLEToNibbles(key).subarray(keyLength % 2), key.length];
};

const decodeLength = (value: Uint8Array): [number, number] => {
  const firstByte = value[0];

  const mode = firstByte & 3;

  if (mode === 0) {
    return [firstByte >> 2, mode];
  }

  if (mode === 1) {
    return [(firstByte + value[1]) >> 2, mode];
  }

  return [value[0], 0];
};

const decodeLeaf = (reader: Uint8Array, keyLen: number): Node => {
  const node = {} as Node;

  const [key, length] = decodeKey(reader, keyLen);
  node.key = key;

  const [, mode] = decodeLength(reader.subarray(length));
  node.value = reader.subarray(length + mode + 1);

  return node;
};

const decodeBranch = (reader: Uint8Array, variant: number, keyLen: number): Node => {
  const node = {
    children: [] as Node[],
  } as Node;

  const [key, length] = decodeKey(reader, keyLen);

  node.key = key;
  const childrenBitmap = reader.subarray(length, length + 2);

  if (variant === BRANCH_WITH_VALUE_VARIANT) {
    node.value = reader.subarray(length + 2);
  }

  let currentIndex = length + 2;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 16; i++) {
    const children = i < 8 ? childrenBitmap[0] : childrenBitmap[1];

    if (((children >> i % 8) & 1) !== 1) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const [size, mode] = decodeLength(reader.subarray(currentIndex));
    currentIndex += mode + 1;

    const hash = reader.subarray(currentIndex, currentIndex + size);
    currentIndex += size;

    let childNode = {
      hashDigest: hash,
    } as Node;

    if (hash.length > 0 && hash.length < HASH_LENGTH) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      childNode = decode(hash);
    }

    node.children[i] = childNode;
  }

  return node;
};

const decode = (reader: Uint8Array): Node => {
  const [variant, partialKeyLength] = decodeHeader(reader);

  const len = partialKeyLength > 63 ? 2 : 1;
  const buffer = reader.subarray(len);

  switch (variant) {
    case LEAF_VARIANT:
      return decodeLeaf(buffer, partialKeyLength);
    case BRANCH_VARIANT:
    case BRANCH_WITH_VALUE_VARIANT:
      return decodeBranch(buffer, variant, partialKeyLength);
    default:
      throw new Error(`not implemented for node type: ${variant}`);
  }
};

const loadProof = (proofHashToNode: Record<string, Node>, branch: Node | undefined) => {
  if (!branch || getNodeType(branch) !== NodeType.BRANCH) return;

  // eslint-disable-next-line no-restricted-syntax
  branch.children.forEach((child, i) => {
    if (child === null) return;

    const proofHash = u8aToHex(child.hashDigest);
    const node = proofHashToNode[proofHash];

    if (node) {
      branch.children[i] = node;
      loadProof(proofHashToNode, node);
    }
  });
};

/**
 * Get decoded trie root from proof encoded nodes
 *
 * @param proofEncodedNodes - Proof encoded nodes from parachain
 * @param root - State root from relay chain
 *
 * @returns {Object}
 */
export const buildTrie = (proofEncodedNodes: Uint8Array[], root: Uint8Array): Node => {
  if (proofEncodedNodes.length === 0) {
    throw new Error('Proofs is empty');
  }

  const proofHashToNode: Record<string, Node> = {};
  let rootNode: Node = {} as Node;

  for (const rawNode of proofEncodedNodes) {
    const decodedNode = decode(rawNode);

    decodedNode.hashDigest = blake2AsU8a(rawNode);

    const hash = decodedNode.hashDigest;
    const proofHash = u8aToHex(hash);
    proofHashToNode[proofHash] = decodedNode;

    if (u8aToHex(hash) === u8aToHex(root)) {
      rootNode = decodedNode;
    }
  }

  loadProof(proofHashToNode, rootNode);

  return rootNode;
};
