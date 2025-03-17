import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/feeFixture';

test.describe(
  'Load Transfer fee as Substrate Polkadot Vault',
  {
    tag: '@fee-test',
  },
  () => {
    substrateChains.forEach((chain) => {
      test(`Can load fee for ${chain.name}`, async ({ vaultWallet }) => {
        await allure.feature('Integration Cases');
        await allure.story('Can load fee for Substrate chains');
        test.slow();
        const assetsPage = await vaultWallet.gotoMain();
        await assetsPage.checkTransferFee(chain);
      });
    });
  },
);
