import { RpcNode } from '@shared/core';
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

export type CheckRpcNodeFxParams = {
  network: ExtendedChain;
  url: string;
};

export type NodeExistParam = CheckRpcNodeFxParams;

export type EditRpcNodeFxParams = {
  network: ExtendedChain;
  form: CustomRpcForm;
  rpcConnectivityResult: RpcCheckResult;
  nodeToEdit: RpcNode;
  isFormValid: true;
};

export type SaveRpcNodeFxParams = {
  network: ExtendedChain;
  form: CustomRpcForm;
  rpcConnectivityResult: RpcCheckResult;
  isNodeExist: false;
  isFormValid: true;
};
