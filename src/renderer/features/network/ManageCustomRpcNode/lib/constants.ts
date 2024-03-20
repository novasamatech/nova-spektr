import { RpcCheckResult } from './types';
import { validateWsAddress } from './utils';
import { RpcValidation } from '@shared/api/network';

const RPC_NAME_MAX_LENGTH = 50;
const RPC_NAME_MIN_LENGTH = 3;

export const fieldRules = {
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
    { name: 'wsAddressValidation', errorText: 'settings.networks.addressInvalidUrl', validator: validateWsAddress },
  ],
};

export const RpcValidationMapping = {
  [RpcValidation.INVALID]: RpcCheckResult.INVALID,
  [RpcValidation.VALID]: RpcCheckResult.VALID,
  [RpcValidation.WRONG_NETWORK]: RpcCheckResult.WRONG_NETWORK,
};
