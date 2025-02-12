import { attach } from 'effector';

import { genericValidateModel } from './generic-validate-model';

export const collectiveSetActiveValidateModel = {
  validate: attach({ effect: genericValidateModel.validate }),
};
