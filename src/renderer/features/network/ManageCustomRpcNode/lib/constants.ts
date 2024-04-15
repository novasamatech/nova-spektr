import { RpcConnectivityResult } from './types';
import { customRpcUtils } from './custom-rpc-utils';
import { RpcValidation } from '@shared/api/network';

const RPC_NAME_MAX_LENGTH = 50;
const RPC_NAME_MIN_LENGTH = 3;

export const FieldRules = {
  name: [
    { name: 'required', errorText: 'settings.networks.requiredNameError', validator: Boolean },
    {
      name: 'minMaxLength',
      errorText: 'settings.networks.maxLengthNameError',
      validator: (value: string) => value.length <= RPC_NAME_MAX_LENGTH && value.length >= RPC_NAME_MIN_LENGTH,
    },
  ],
  url: [
    { name: 'required', errorText: 'settings.networks.addressEmpty', validator: Boolean },
    {
      name: 'wsAddressValidation',
      errorText: 'settings.networks.addressInvalidUrl',
      validator: customRpcUtils.validateWsAddress,
    },
  ],
};

export const RpcValidationMapping = {
  [RpcValidation.INVALID]: RpcConnectivityResult.INVALID,
  [RpcValidation.VALID]: RpcConnectivityResult.VALID,
  [RpcValidation.WRONG_NETWORK]: RpcConnectivityResult.WRONG_NETWORK,
};
