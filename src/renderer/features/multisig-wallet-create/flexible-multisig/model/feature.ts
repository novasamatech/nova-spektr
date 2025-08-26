import { combine } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';

import { formModel } from './form-model';

const $input = combine(formModel.form.fields.chainId.$value, networkModel.$apis, (chainId, apis) => {
  if (nullable(apis[chainId])) return null;

  return {
    api: apis[chainId],
  };
});

export const flexibleMultisigFeature = createFeature({
  name: 'flexible/pairing',
  enable: $features.map(({ flexibleMultisig }) => flexibleMultisig),
  input: $input,
});
