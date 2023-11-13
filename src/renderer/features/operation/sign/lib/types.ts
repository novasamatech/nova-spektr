import type { HexString } from '@shared/core';

export type SignResponse = {
  payload: string;
  signature: HexString;
};
