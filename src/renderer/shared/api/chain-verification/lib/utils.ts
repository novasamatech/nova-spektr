import { NodeType } from './constants';
import { type Node } from './types';

/**
 * Transform little endian byte array to nibbles array
 *
 * @param key Little endian byte array
 *
 * @returns {Array}
 */
export const keyLEToNibbles = (key: Uint8Array): Uint8Array => {
  if (key.length === 0) {
    return new Uint8Array([]);
  }

  if (key.length === 1 && key.at(0) === 0) {
    return new Uint8Array([0, 0]);
  }

  const nibblesLength = key.length * 2;
  const nibbles = new Uint8Array(nibblesLength);

  key.forEach((value, i) => {
    nibbles[2 * i] = value / 16;
    nibbles[2 * i + 1] = value % 16;
  });

  return nibbles;
};

/**
 * Get node type by children amount
 *
 * @param n Node
 *
 * @returns {Object}
 */
export const getNodeType = (n: Node): NodeType => {
  if (n.children?.length > 0) {
    return NodeType.BRANCH;
  }

  return NodeType.LEAF;
};
