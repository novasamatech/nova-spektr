import { BasePageElements } from './BasePageElements';

export class AssetsPageElements implements BasePageElements {
  url = '/#/assets';
  accountButton = 'test_account $';
  assetsPageLocator = 'text=Portfolio';
  settingsModalWindowButtonSelector = '[id="headlessui-menu-button-\\:r3\\:"]';
  transferFeeSelector = '//*[@id="headlessui-dialog-panel-:r2o:"]/section/div/div[1]/div/div/dd/div/span'
}
