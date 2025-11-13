export const userAccount = {
  walletId: 1,
  accountType: 'extension',
  extension: 'polkadot-js',
  accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
  cryptoType: 0,
  name: 'One Guy',
  type: 'universal',
  signingType: 'signing_ext',
  id: '1 0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724 universal',
};

export const multisigAccount1 = {
  name: '13HZ3...deSPH',
  type: 'universal',
  accountType: 'multisig',
  accountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  walletId: 10,
  id: '10 0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251 universal',
};

export const proxiedAccount1 = {
  name: 'Any for pure 5Fsaa9...cP334P',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0xa874b5fd9d998f77d59e55621555a5b31edb375ab45da34288c939639359d5bc',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  proxyVariant: 'pure',
  cryptoType: 0,
  signingType: 'signing_wo',
  deposit: '1002050000000',
  entropyBlockNumber: 6147577,
  extrinsicIndex: 2,
  connections: [
    {
      delay: 0,
      proxyAccountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
      proxyType: 'Any',
    },
  ],
  walletId: 2,
  id: '2 0xa874b5fd9d998f77d59e55621555a5b31edb375ab45da34288c939639359d5bc 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const proxiedAccount2 = {
  name: 'Any for pure 5CWor8...31g6SC',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  proxyVariant: 'pure',
  cryptoType: 0,
  signingType: 'signing_wo',
  deposit: '1002050000000',
  entropyBlockNumber: 6146859,
  extrinsicIndex: 2,
  connections: [
    {
      delay: 0,
      proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
    },
  ],
  walletId: 3,
  id: '3 0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const proxiedAccount3 = {
  name: 'Any for pure 5Dstw3...QHQCaX',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  proxyVariant: 'pure',
  cryptoType: 0,
  signingType: 'signing_wo',
  deposit: '1002050000000',
  entropyBlockNumber: 6146810,
  extrinsicIndex: 2,
  connections: [
    {
      delay: 0,
      proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
    },
  ],
  walletId: 4,
  id: '4 0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

// Sync result proxy entities
export const syncProxy1 = {
  type: 'proxy',
  accountId: '0xa874b5fd9d998f77d59e55621555a5b31edb375ab45da34288c939639359d5bc',
  proxyAccountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '1002050000000',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6147577,
  extrinsicIndex: 2,
};

export const syncProxy2 = {
  type: 'proxy',
  accountId: '0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '1002050000000',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6146859,
  extrinsicIndex: 2,
};

export const syncProxy3 = {
  type: 'proxy',
  accountId: '0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '1002050000000',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6146810,
  extrinsicIndex: 2,
};

// Wallet entities
export const oneGuyWallet = {
  name: 'One Guy',
  type: 'wallet_polkadot_ext',
  signingType: 'signing_ext',
  id: 1,
  accounts: [userAccount],
};

export const proxiedWallet1 = {
  name: 'Any for pure 5Fsaa9...cP334P',
  type: 'wallet_pxd',
  id: 2,
  accounts: [proxiedAccount1],
};

export const proxiedWallet2 = {
  name: 'Any for pure 5CWor8...31g6SC',
  type: 'wallet_pxd',
  id: 3,
  accounts: [proxiedAccount2],
};

export const proxiedWallet3 = {
  name: 'Any for pure 5Dstw3...QHQCaX',
  type: 'wallet_pxd',
  id: 4,
  accounts: [proxiedAccount3],
};

export const multisigWallet1 = {
  name: '13HZ3...deSPH',
  type: 'wallet_ms',
  id: 10,
  accounts: [multisigAccount1],
};

// Indexed blocks map
export const indexedBlocks = new Map([['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42', 6152557]]);

export const allAccounts = [userAccount, multisigAccount1, proxiedAccount1, proxiedAccount2, proxiedAccount3];

export const allWallets = [oneGuyWallet, proxiedWallet1, proxiedWallet2, proxiedWallet3, multisigWallet1];

export const allChains = {
  '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42': { addressPrefix: 0 },
};

export const syncResult = {
  accounts: [syncProxy1, syncProxy2, syncProxy3],
  chains: ['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42'],
  indexedBlocks,
};
