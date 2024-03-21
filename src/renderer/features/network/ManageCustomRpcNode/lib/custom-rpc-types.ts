import { RpcNode } from '@shared/core';
import { ExtendedChain } from '@entities/network';

export const enum RpcConnectivityResult {
  'INIT',
  'VALID',
  'INVALID',
  'WRONG_NETWORK',
}

export type CustomRpcForm = {
  name: string;
  url: string;
};

export type VerifyRpcConnectivityFxParams = {
  chainId: ExtendedChain['chainId'];
  url: string;
};

export type NodeExistParam = {
  network: ExtendedChain;
  url: string;
};

export type EditRpcNodeFxParams = {
  network: ExtendedChain;
  form: CustomRpcForm;
  rpcConnectivityResult: RpcConnectivityResult;
  nodeToEdit: RpcNode;
  isFormValid: true;
};

export type SaveRpcNodeFxParams = {
  network: ExtendedChain;
  form: CustomRpcForm;
  rpcConnectivityResult: RpcConnectivityResult;
  isNodeExist: false;
  isFormValid: true;
};
