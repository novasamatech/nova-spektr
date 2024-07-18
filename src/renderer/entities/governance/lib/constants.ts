import { type GovernanceApi, polkassemblyService, subsquareService } from '@/shared/api/governance';

import { type SourceType } from './types';

export const GOVERNANCE_API_KEY = 'governance_api';

export const GovernanceApis: Record<SourceType, GovernanceApi> = {
  polkassembly: polkassemblyService,
  subsquare: subsquareService,
};
