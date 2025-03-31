import { ChainModel } from 'tests/system/data/chains/testChainModel';
import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';
import { TransferModalElements } from '../_elements/TransferModalElements';
import { TransferModalWindow } from '../modals/TransferModalWindow';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';

export class BaseAssetsPage extends BasePage<AssetsPageElements> {
    public async openTransfer(chain: ChainModel, assetId: number): Promise<TransferModalWindow> {
        return new TransferModalWindow(this.page, new TransferModalElements(), this, chain, assetId).openTransferModal();
      }
    
    public async goToSettingsPage(): Promise<BaseSettingsPage> {
        return new BaseSettingsPage(this.page, new SettingsPageElements()).gotoMain();
      }
    
    public async openWalletManagement(): Promise<WalletModalWindow> {
        await this.click(this.pageElements.accountButton);
    
        return new WalletModalWindow(this.page, new WalletModalElements(), this);
      }

    
}
