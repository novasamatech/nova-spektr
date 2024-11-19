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
        test.slow();
        const assetsPage = await vaultWallet.gotoMain();
        await assetsPage.checkTransferFee(chain);
      });
    });
  },
);
