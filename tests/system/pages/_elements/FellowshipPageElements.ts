import { TEST_IDS } from '@/shared/constants';

import { type BasePageElements } from './BasePageElements';

export class FellowshipPageElements implements BasePageElements {
  url = '/#/fellowship';

  accountButton = TEST_IDS.COMMON.WALLET_BUTTON;
}
