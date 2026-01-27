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

export const multisigAccount2 = {
  name: '13oKT...bKKxZ',
  type: 'universal',
  accountType: 'multisig',
  accountId: '0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda',
  threshold: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29' },
  ],
  walletId: 11,
  id: '11 0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda universal',
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

export const flexMultisigAccount1 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: 'qwwwq',
  accountId: '0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7',
  connections: [
    {
      proxyMultisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
      delay: 0,
    },
  ],
  deposit: '12345',
  entropyBlockNumber: 6146859,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 68,
  id: '68 0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount2 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '12pC5...oaoVD',
  accountId: '0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0',
  connections: [
    {
      proxyMultisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
      delay: 0,
    },
  ],
  deposit: '12345',
  entropyBlockNumber: 6146810,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 69,
  id: '69 0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
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

export const proxiedAccount4 = {
  name: 'Any for pure 5E7w5q...sW5pbt',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  proxyVariant: 'pure',
  cryptoType: 0,
  signingType: 'signing_wo',
  deposit: '1002050000000',
  connections: [
    {
      delay: 0,
      proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
    },
  ],
  walletId: 5,
  id: '5 0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount3 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '134EE...2GJcv',
  accountId: '0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  connections: [
    {
      proxyMultisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
      proxyType: 'Any',
      delay: 0,
    },
  ],
  deposit: '12345',
  entropyBlockNumber: 6147631,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 70,
  id: '70 0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

// Individual sync result entities
export const syncProxy1 = {
  type: 'proxy',
  accountId: '0xa874b5fd9d998f77d59e55621555a5b31edb375ab45da34288c939639359d5bc',
  proxyAccountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6147577,
  extrinsicIndex: 2,
};

export const syncMultisig1 = {
  type: 'multisig',
  accountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  signatories: [
    '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
    '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477',
  ],
  threshold: 2,
};

export const syncMultisig2 = {
  type: 'multisig',
  accountId: '0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda',
  signatories: [
    '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
    '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29',
  ],
  threshold: 2,
};

export const syncProxy2 = {
  type: 'proxy',
  accountId: '0x13e88c12dcba37a98175e5c05b3b6b3bbf69472d3e16eea814d6eae06b5312e7',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
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
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6146810,
  extrinsicIndex: 2,
};
export const syncProxy4 = {
  type: 'proxy',
  accountId: '0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6147631,
  extrinsicIndex: 2,
};

// Individual wallet entities
export const oneGuyWallet = {
  name: 'One Guy',
  type: 'wallet_polkadot_ext',
  signingType: 'signing_ext',
  id: 1,
  accounts: [userAccount],
};

export const flexMultisigWallet1 = {
  name: 'first wallet',
  type: 'wallet_fxms',
  id: 68,
  accounts: [flexMultisigAccount1],
};

export const flexMultisigWallet2 = {
  name: 'second wallet',
  type: 'wallet_fxms',
  id: 69,
  accounts: [flexMultisigAccount2],
};

export const flexMultisigWallet3 = {
  name: 'third wallet',
  type: 'wallet_fxms',
  id: 70,
  accounts: [flexMultisigAccount3],
};

export const multisigWallet1 = {
  name: '13HZ3...deSPH',
  type: 'wallet_ms',
  id: 10,
  accounts: [multisigAccount1],
};

// Indexed blocks map
export const indexedBlocks = new Map([
  ['0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008', 2996917],
  ['0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9', 7123449],
  ['0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e', 27839345],
  ['0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', 30227153],
  ['0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f', 5866882],
  ['0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a', 1927627],
  ['0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4', 2668025],
  ['0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a', 10974940],
  ['0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e', 46124909],
  ['0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d', 12709474],
  ['0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9', 12860393],
  ['0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050', 3569816],
  ['0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d', 9349000],
  ['0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f', 9742561],
  ['0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b', 13256972],
  ['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42', 6152557],
  ['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3', 27896261],
]);

export const allAccounts = [
  userAccount,
  multisigAccount1,
  multisigAccount2,
  proxiedAccount1,
  proxiedAccount2,
  proxiedAccount3,
  proxiedAccount4,
  flexMultisigAccount1,
  flexMultisigAccount2,
  flexMultisigAccount3,
];

export const allWallets = [
  oneGuyWallet,
  {
    name: 'Any for pure 5Fsaa9...cP334P',
    type: 'wallet_pxd',
    id: 2,
    accounts: [proxiedAccount1],
  },
  {
    name: 'Any for pure 5CWor8...31g6SC',
    type: 'wallet_pxd',
    id: 3,
    accounts: [proxiedAccount2],
  },
  // ... (other wallets kept as inline for brevity)
  {
    name: 'Any for pure 5Dstw3...QHQCaX',
    type: 'wallet_pxd',
    id: 4,
    accounts: [
      {
        name: 'Any for pure 5Dstw3...QHQCaX',
        type: 'chain',
        accountType: 'proxied',
        accountId: '0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0',
        chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
        proxyVariant: 'pure',
        cryptoType: 0,
        signingType: 'signing_wo',
        deposit: '1002050000000',
        connections: [
          {
            delay: 0,
            proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
            proxyType: 'Any',
          },
        ],
        walletId: 4,
        id: '4 0x503a0d03cb328cc865be9d9bfe0eb071fb4ea40b63bd54537d953a544cda16a0 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
      },
    ],
  },
  multisigWallet1,
  flexMultisigWallet1,
  flexMultisigWallet2,
  flexMultisigWallet3,
];

export const allChains = { '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42': { addressPrefix: 0 } };

export const syncResult = {
  accounts: [syncMultisig1, syncMultisig2, syncProxy1, syncProxy2, syncProxy3, syncProxy4],
  chains: ['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42'],
  indexedBlocks,
};
