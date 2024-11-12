import { combine } from 'effector';

import { createFeature } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';

import { formModel } from './form-model';

const $input = combine(formModel.$createMultisigForm.fields.chain.$value, networkModel.$apis, (chain, apis) => {
  if (nullable(chain) || nullable(apis[chain.chainId])) return null;

  return {
    api: apis[chain.chainId],
  };
});

export const flexibleMultisigFeature = createFeature({
  name: 'Flexible multisig create',
  input: $input,
});
