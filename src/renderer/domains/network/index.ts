import { accountsDomainModel } from './accounts/model';
import { accountsService } from './accounts/service';

export const networkDomain = {
  accounts: accountsDomainModel,

  accountsService,
};

export type { AnyAccount, ChainAccount, UniversalAccount } from './accounts/types';
