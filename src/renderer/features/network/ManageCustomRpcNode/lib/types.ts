import { ExtendedChain } from '@entities/network';

export const enum RpcCheckResult {
  'INIT',
  'VALID',
  'INVALID',
  'WRONG_NETWORK',
}

export type CustomRpcForm = {
  name: string;
  url: string;
};

export type NodeExistParam = {
  network: ExtendedChain | null;
  url: string;
};
