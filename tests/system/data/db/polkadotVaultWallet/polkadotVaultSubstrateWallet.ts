import { type IndexedDBData } from '../../../utils/interactWithDatabase';

export const vaultSubstrateWallet: IndexedDBData = {
  database: 'spektr',
  table: 'wallets',
  injectingData: [
    { id: 42, isActive: true, name: 'polkadotVaultAllNetworks', signingType: 'signing_ps', type: 'wallet_sps' },
  ],
};

export const vaultSubstrateAccount: IndexedDBData = {
  database: 'spektr',
  table: 'accounts2',
  injectingData: [
    {
      accountId: '0x46d63225595d25a3d9c5f243712c580756d5ba654008d9568d7e31e1964c5077',
      signingType: 'signing_pv',
      cryptoType: 0,
      id: '42 0x46d63225595d25a3d9c5f243712c580756d5ba654008d9568d7e31e1964c5077 universal',
      name: 'polkadotVaultAllNetworks',
      type: 'universal',
      accountType: 'base',
      walletId: 42,
    },
  ],
};
