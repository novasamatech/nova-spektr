import { customRpcUtils } from './custom-rpc-utils';

const RPC_NAME_MAX_LENGTH = 50;
const RPC_NAME_MIN_LENGTH = 3;

export const CONNECTION_TIMEOUT = 3000;

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
