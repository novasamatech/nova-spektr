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
        test.slow();
        const assetsPage = await vaultWallet.gotoMain();
        await assetsPage.checkTransferFee(chain);
      });
    });
  },
);
