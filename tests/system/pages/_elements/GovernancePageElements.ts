import { TEST_IDS } from '@/shared/constants';

import { type BasePageElements } from './BasePageElements';

export class GovernancePageElements implements BasePageElements {
  url = '/#/governance';

  accountButton = TEST_IDS.COMMON.WALLET_BUTTON;
}
