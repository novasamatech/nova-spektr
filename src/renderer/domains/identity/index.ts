import { identityDomainModel } from './model/identity/model';

export const identityDomain = {
  identity: identityDomainModel,
};

export { identityDomainModel as identity };

export type { AccountIdentity, IdentityMap } from './model/identity/types';
