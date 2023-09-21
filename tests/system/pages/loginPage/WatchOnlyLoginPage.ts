import { Page } from 'playwright';
import { BaseLoginPage } from "./BaseLoginPage";
import { LoginPageElements } from "./LoginPageElements"

export class WatchOnlyLoginPage extends BaseLoginPage {

    constructor(page: Page) {
        super(page);
    }

    private async clickAccountAddressField(): Promise<WatchOnlyLoginPage> {
        await this.page.click(this.pageElements.enterAccountAddress);
        return this
    }

    private async fillAccountAddress(address: string): Promise<WatchOnlyLoginPage> {
        await this.page.fill(this.pageElements.enterAccountAddress, address);
        return this
    }

    private async clickWalletNameField(): Promise<WatchOnlyLoginPage> {
        await this.page.click(this.pageElements.enterAccountName);
        return this
    }

    private async fillWalletName(name: string): Promise<WatchOnlyLoginPage> {
        await this.page.fill(this.pageElements.enterAccountName, name);
        return this
    }
}