import type { SourceType } from './types';
import { IGovernanceApi, polkassemblyService, subsquareService } from '@shared/api/governance';

export const GOVERNANCE_API_KEY = 'governance_api';

export const GovernanceApis: Record<SourceType, IGovernanceApi> = {
  polkassembly: polkassemblyService,
  subsquare: subsquareService,
};
