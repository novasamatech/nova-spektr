import { RpcCheckResult } from './custom-rpc-types';
import { customRpcUtils } from './custom-rpc-utils';
import { RpcValidation } from '@shared/api/network';

const RPC_NAME_MAX_LENGTH = 50;
const RPC_NAME_MIN_LENGTH = 3;

const FieldRules = {
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

const RpcValidationMapping = {
  [RpcValidation.INVALID]: RpcCheckResult.INVALID,
  [RpcValidation.VALID]: RpcCheckResult.VALID,
  [RpcValidation.WRONG_NETWORK]: RpcCheckResult.WRONG_NETWORK,
};

export const customRpcConstants = {
  RpcValidationMapping,
  FieldRules,
};
