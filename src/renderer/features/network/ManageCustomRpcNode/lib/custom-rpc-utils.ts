import { RpcConnectivityResult } from './custom-rpc-types';

/**
 * Validate WebSocket address
 * @param address address to validate
 * @return {Boolean}
 */
const validateWsAddress = (address: string): boolean => {
  return /^ws(s)?:\/\/.+(\.[a-z]{2,}|:\d{4,5})(\/[a-z\d_-]+)*\W{0}\/?/i.test(address);
};

const isRpcConnectivityValid = (rpcConnectivityResult: RpcConnectivityResult) =>
  rpcConnectivityResult === RpcConnectivityResult.VALID;

const isRpcConnectivityInvalid = (rpcConnectivityResult: RpcConnectivityResult) =>
  rpcConnectivityResult === RpcConnectivityResult.INVALID;

const isRpcConnectivityWrongNetwork = (rpcConnectivityResult: RpcConnectivityResult) =>
  rpcConnectivityResult === RpcConnectivityResult.WRONG_NETWORK;

export const customRpcUtils = {
  validateWsAddress,
  isRpcConnectivityValid,
  isRpcConnectivityInvalid,
  isRpcConnectivityWrongNetwork,
};
