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
  table: 'accounts',
  injectingData: [
    {
      accountId: '0xaccace4056a930745218328bf086369fbd61c212',
      chainType: 1,
      cryptoType: 3,
      id: 31,
      name: 'vaultAndEthereumWallet',
      type: 'base',
      walletId: 31,
    },
  ],
};
