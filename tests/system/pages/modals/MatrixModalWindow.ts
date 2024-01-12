import { Page } from 'playwright';

import { MatrixModalElements } from '../_elements/MatrixModalElements';
import { BaseModal } from '../BaseModalWindow';
import { BasePage } from '../BasePage';

export class MatrixModalWindow extends BaseModal {
  public pageElements: MatrixModalElements;
  public previosPage: BasePage;

  constructor(page: Page, pageElements: MatrixModalElements, previousPage: BasePage) {
    super(page);
    this.pageElements = pageElements;
  }

  public async fillUsername(userName: string): Promise<MatrixModalWindow> {
    await this.clickIntoField(this.pageElements.userName);
    await this.fillFieldByValue(this.pageElements.userName, userName);

    return this;
  }

  public async fillPasswordField(password: string): Promise<MatrixModalWindow> {
    await this.clickIntoField(this.pageElements.userPassword);
    await this.fillFieldByValue(this.pageElements.userPassword, password);

    return this;
  }

  public async matrixAuthentificate(username: string, password: string): Promise<MatrixModalWindow> {
    await this.fillUsername(username);
    await this.fillPasswordField(password);
    await this.clickOnButton(this.pageElements.logIn);

    return this;
  }

  public async matrixLogOut(): Promise<MatrixModalWindow> {
    await this.clickOnButton(this.pageElements.logOut);

    return this;
  }
}
