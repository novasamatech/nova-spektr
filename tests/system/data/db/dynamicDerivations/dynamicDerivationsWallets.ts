import { type IndexedDBData } from '../../../utils/interactWithDatabase';

export const vaultDPPolkadotTestWallet: IndexedDBData = {
  database: 'spektr',
  table: 'wallets',
  injectingData: [
    { id: 1, isActive: true, name: 'vaultDynamicDerivationsPolkadot', signingType: 'signing_pv', type: 'wallet_pv' },
  ],
};

export const vaultDPPolkadotTestAccount: IndexedDBData = {
  database: 'spektr',
  table: 'accounts2',
  injectingData: [
    {
      id: '1 0x7a28037947ecebe0dd86dc0e910911cb33185fd0714b37b75943f67dcf9b6e7c universal',
      accountId: '0x7a28037947ecebe0dd86dc0e910911cb33185fd0714b37b75943f67dcf9b6e7c',
      cryptoType: 0,
      name: '',
      accountType: 'base',
      signingType: 'signing_pv',
      type: 'universal',
      walletId: 1,
    },
    {
      accountId: '0x2a8f1ce5d56835b49e439e447a38aa1f22295d4093df756cab5e5bb39bd9f563',
      baseAccountId: '0x7a28037947ecebe0dd86dc0e910911cb33185fd0714b37b75943f67dcf9b6e7c',
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      cryptoType: 0,
      derivationPath: '//polkadot',
      id: '1 0x2a8f1ce5d56835b49e439e447a38aa1f22295d4093df756cab5e5bb39bd9f563 0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      keyType: 'main',
      name: 'Main',
      signingType: 'signing_pv',
      accountType: 'chain',
      type: 'chain',
      walletId: 1,
    },
  ],
};
