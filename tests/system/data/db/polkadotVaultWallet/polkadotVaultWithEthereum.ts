import { type IndexedDBData } from '../../../utils/interactWithDatabase';

export const vaultAndEthereumWallet: IndexedDBData = {
  database: 'spektr',
  table: 'wallets',
  injectingData: [
    { id: 31, isActive: true, name: 'vaultAndEthereumWallet', signingType: 'signing_ps', type: 'wallet_sps' },
  ],
};

export const vaultAndEthereumAccount: IndexedDBData = {
  database: 'spektr',
  table: 'accounts2',
  injectingData: [
    {
      accountId: '0xaccace4056a930745218328bf086369fbd61c212',
      signingType: 'signing_pv',
      cryptoType: 3,
      id: '31 0xaccace4056a930745218328bf086369fbd61c212 universal',
      name: 'vaultAndEthereumWallet',
      accountType: 'base',
      type: 'universal',
      walletId: 31,
    },
  ],
};
