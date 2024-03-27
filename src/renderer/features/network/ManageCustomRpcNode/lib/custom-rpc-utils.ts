import { RpcConnectivityResult } from './custom-rpc-types';

export const customRpcUtils = {
  validateWsAddress,
  isRpcConnectivityValid,
  isRpcConnectivityInvalid,
  isRpcConnectivityWrongNetwork,
};

/**
 * Validate WebSocket address
 * @param address address to validate
 * @return {Boolean}
 */
function validateWsAddress(address: string): boolean {
  return /^ws(s)?:\/\/.+(\.[a-z]{2,}|:\d{4,5})(\/[a-z\d_-]+)*\W{0}\/?/i.test(address);
}

function isRpcConnectivityValid(result: RpcConnectivityResult): boolean {
  return result === RpcConnectivityResult.VALID;
}

function isRpcConnectivityInvalid(result: RpcConnectivityResult): boolean {
  return result === RpcConnectivityResult.INVALID;
}

function isRpcConnectivityWrongNetwork(result: RpcConnectivityResult): boolean {
  return result === RpcConnectivityResult.WRONG_NETWORK;
}
