import type { SourceType } from './types';
import { GovernanceApi, polkassemblyService, subsquareService } from '@shared/api/governance';

export const GOVERNANCE_API_KEY = 'governance_api';

export const GovernanceApis: Record<SourceType, GovernanceApi> = {
  polkassembly: polkassemblyService,
  subsquare: subsquareService,
};
