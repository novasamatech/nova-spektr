import * as allure from 'allure-js-commons';

import { ethChains } from '../../data/chains/chainsList';
import { test } from '../../utils/feeFixture';

test.describe(
  'Load Transfer fee as ethereum_based polkadot Vault wallet',
  {
    tag: ['@fee-test', '@eth-test'],
  },
  () => {
    ethChains.forEach((chain) => {
      test(`Can load fee for ${chain.name}`, async ({ vaultWallet }) => {
        await allure.feature('Integration Cases');
        await allure.story('Can load fee for EVM chains');
        test.slow();
        const assetsPage = await vaultWallet.gotoMain();
        await assetsPage.checkTransferFee(chain);
      });
    });
  },
);
