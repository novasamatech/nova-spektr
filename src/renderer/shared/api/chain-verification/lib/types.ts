export type Node = {
  key: Uint8Array;
  value: Uint8Array;
  children: Node[];
  hashDigest: Uint8Array;
};
