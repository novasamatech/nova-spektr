import { validateWsAddress } from '@shared/lib/utils';

export const fieldRules = {
  name: [
    { name: 'required', errorText: 'settings.networks.requiredNameError', validator: Boolean },
    {
      name: 'minMaxLength',
      errorText: 'settings.networks.maxLengthNameError',
      validator: (val: string) => val.length <= 50 && val.length >= 3,
    },
  ],
  url: [
    { name: 'required', errorText: 'settings.networks.addressEmpty', validator: Boolean },
    { name: 'wsAddressValidation', errorText: 'settings.networks.addressInvalidUrl', validator: validateWsAddress },
  ],
};
