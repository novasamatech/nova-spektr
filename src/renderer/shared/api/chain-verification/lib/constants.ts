export const enum NodeType {
  LEAF,
  BRANCH,
}

export const HASH_LENGTH = 32;

export const HEADER_MASK = 0b1100_0000;
export const KEY_LENGTH_MASK = 0b0011_1111;

export const LEAF_VARIANT = 0b0100_0000;
export const BRANCH_VARIANT = 0b1000_0000;
export const BRANCH_WITH_VALUE_VARIANT = 0b1100_0000;

export const VARIANTS = [LEAF_VARIANT, BRANCH_VARIANT, BRANCH_WITH_VALUE_VARIANT];
