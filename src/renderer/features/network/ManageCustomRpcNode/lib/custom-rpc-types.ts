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
  network: ExtendedChain;
  url: string;
};

export type NodeExistParam = VerifyRpcConnectivityFxParams;

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
