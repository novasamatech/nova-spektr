import { RpcValidation } from '@shared/api/network';

export const customRpcUtils = {
  validateWsAddress,
  isRpcValid,
  isRpcInvalid,
  isRpcWrongNetwork,
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
