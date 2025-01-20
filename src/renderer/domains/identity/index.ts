import { identityDomainModel } from './model/identity/model';

export const identityDomain = {
  identity: identityDomainModel,
};

export { identityDomainModel as identity };

export type { AccountIdentity } from './model/identity/types';
