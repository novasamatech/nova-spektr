import { RpcValidation } from './types';
import { type RpcNode } from '@shared/core';

export const customRpcUtils = {
  validateWsAddress,
  isRpcValid,
  isRpcInvalid,
  isRpcWrongNetwork,
  isSameNode,
};

/**
 * Validate WebSocket address
 * @param address address to validate
 * @return {Boolean}
 */
function validateWsAddress(address: string): boolean {
  return /^ws(s)?:\/\/.+(\.[a-z]{2,}|:\d{4,5})(\/[a-z\d_-]+)*\W{0}\/?/i.test(address);
}

function isRpcValid(result: RpcValidation): boolean {
  return result === RpcValidation.VALID;
}

function isRpcInvalid(result: RpcValidation): boolean {
  return result === RpcValidation.INVALID;
}

function isRpcWrongNetwork(result: RpcValidation): boolean {
  return result === RpcValidation.WRONG_NETWORK;
}

function isSameNode(nodeOne: RpcNode, nodeTwo: RpcNode): boolean {
  return nodeOne.name === nodeTwo.name && nodeOne.url === nodeTwo.url;
}
