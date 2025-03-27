import * as allure from 'allure-js-commons';
import { test } from '../../utils/baseRegularFixture';


const feature = 'Wallets. Watch-only. Single wallet';
const story = 'Transfers';

test.describe('Watch-only transfers', { tag: ['@watch-only-transfers', '@regress'] }, () => {
  test('Watch-only transfer', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    const watchOnlyWallet = await loginPage.createBaseWatchOnlyWallet();
    const assetsPage = await watchOnlyWallet.gotoMain();
    await assetsPage.checkTransferButtonNotExists();
    
  });
});