import { TEST_IDS } from '../../../testIds';

import { type BasePageElements } from './BasePageElements';

export class AssetsPageElements implements BasePageElements {
  url = '/#/assets';
  accountButton = TEST_IDS.MAIN.WALLET_BUTTON;
  assetsPageLocator = 'text=Portfolio';
}
