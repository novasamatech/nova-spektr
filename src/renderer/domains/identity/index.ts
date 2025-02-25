import { identityDomainModel } from './model/identity/model';
import { identityService } from './model/identity/service';

export const identityDomain = {
  identity: identityDomainModel,
  service: identityService,
};

export { identityDomainModel as identity };

export type { AccountIdentity, IdentityMap } from './model/identity/types';
