import { combine } from 'effector';

import { createFeature } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';

import { formModel } from './form-model';

const $input = combine(formModel.$createMultisigForm.fields.chainId.$value, networkModel.$apis, (chainId, apis) => {
  if (nullable(apis[chainId])) return null;

  return {
    api: apis[chainId],
  };
});

export const flexibleMultisigFeature = createFeature({
  name: 'Flexible multisig create',
  input: $input,
});
