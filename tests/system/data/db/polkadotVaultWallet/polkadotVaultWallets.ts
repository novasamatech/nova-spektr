import { IndexedDBData } from '../../../utils/interactWithDatabase';

export const vaultAllTestWallet: IndexedDBData = {
  database: 'spektr',
  table: 'wallets',
  testData: [
    { id: 42, isActive: true, name: 'polkadotVaultAllNetworks', signingType: 'signing_ps', type: 'wallet_sps' },
  ],
};

export const vaultAllTestAccount: IndexedDBData = {
  database: 'spektr',
  table: 'accounts',
  testData: [
    {
      accountId: '0x46d63225595d25a3d9c5f243712c580756d5ba654008d9568d7e31e1964c5077',
      chainType: 0,
      cryptoType: 0,
      id: 131,
      name: 'polkadotVaultAllNetworks',
      type: 'base',
      walletId: 42,
    },
  ],
};
