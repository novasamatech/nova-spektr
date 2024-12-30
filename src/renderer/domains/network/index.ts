import { accountsDomainModel } from './accounts/model';
import { accountsService } from './accounts/service';

export const networkDomain = {
  accounts: accountsDomainModel,

  accountsService,
};

export { accountsDomainModel as accounts } from './accounts/model';
export { accountsService } from './accounts/service';

export type { AnyAccount, AnyAccountDraft, ChainAccount, UniversalAccount } from './accounts/types';
