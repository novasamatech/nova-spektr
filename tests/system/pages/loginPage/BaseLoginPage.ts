import { Page } from 'playwright';
import { LoginPageElements } from './LoginPageElements';
import { BasePage } from '../BasePage';


export class BaseLoginPage extends BasePage {
  protected pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async gotoOnboarding(): Promise<BaseLoginPage>  {
    await this.page.goto(this.pageElements.url);
    return this
  }

  public async clickWatchOnlyButton(): Promise<BaseLoginPage>  {
    await this.page.click(this.pageElements.watchOnlyButton);
    return this
  }

  // private async clickContinueButton(): Promise<BaseLoginPage>  {
  //   await this.page.click(this.pageElements.continueButton);
  //   return this
  // }

  // private async clickWatchOnlyAccountButton(accountName: string): Promise<BaseLoginPage>  {
  //   await this.page.click(`text=${accountName} Watch-only`);
  //   return this
  // }

  // private async clickAddButton(): Promise<BaseLoginPage>  {
  //   await this.page.click('text=Add');
  //   return this
  // }

  // private async clickMultisigButton(): Promise<BaseLoginPage>  {
  //   await this.page.click('text=Multisig');
  //   return this
  // }

  // private async clickUsernameField(): Promise<BaseLoginPage> {
  //   await this.page.click('placeholder=Enter username');
  //   return this
  // }
}
