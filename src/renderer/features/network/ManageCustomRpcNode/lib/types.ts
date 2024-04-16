import { ChainId } from '@shared/core';

export type CustomRpcForm = {
  name: string;
  url: string;
};

export type VerifyRpcParams = {
  chainId: ChainId;
  url: string;
};

// TODO: remove
export const enum RpcConnectivity {
  'INIT',
  'VALID',
  'INVALID',
  'WRONG_NETWORK',
}
