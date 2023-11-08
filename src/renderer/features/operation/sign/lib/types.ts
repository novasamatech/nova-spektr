import { HexString } from '@renderer/shared/core';

export type SignResponse = {
  payload: string;
  signature: HexString;
};
