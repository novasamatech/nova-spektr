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
  remarkChainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  blockNumber: 6146859,
  extrinsicIndex: 2,
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
  remarkChainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  blockNumber: 6147631,
  extrinsicIndex: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29' },
  ],
  walletId: 11,
  id: '11 0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda universal',
};

export const multisigAccount3 = {
  name: '14pC5...oaoVD',
  type: 'universal',
  accountType: 'multisig',
  accountId: '0x8aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  threshold: 3,
  cryptoType: 0,
  signingType: 'signing_ms',
  remarkChainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  blockNumber: 6147810,
  extrinsicIndex: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
    { accountId: '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29' },
  ],
  walletId: 12,
  id: '12 0x8aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9 universal',
};

// Sync result multisig entities
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

export const syncMultisig3 = {
  type: 'multisig',
  accountId: '0x8aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  signatories: [
    '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
    '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477',
    '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29',
  ],
  threshold: 3,
};

// Wallet entities
export const oneGuyWallet = {
  name: 'One Guy',
  type: 'wallet_polkadot_ext',
  signingType: 'signing_ext',
  id: 1,
  accounts: [userAccount],
};

export const multisigWallet1 = {
  name: '13HZ3...deSPH',
  type: 'wallet_ms',
  id: 10,
  accounts: [multisigAccount1],
};

export const multisigWallet2 = {
  name: '13oKT...bKKxZ',
  type: 'wallet_ms',
  id: 11,
  accounts: [multisigAccount2],
};

export const multisigWallet3 = {
  name: '14pC5...oaoVD',
  type: 'wallet_ms',
  id: 12,
  accounts: [multisigAccount3],
};

// Indexed blocks map
export const indexedBlocks = new Map([
  ['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42', 6152557],
]);

export const allAccounts = [
  userAccount,
  multisigAccount1,
  multisigAccount2,
  multisigAccount3,
];

export const allWallets = [
  oneGuyWallet,
  multisigWallet1,
  multisigWallet2,
  multisigWallet3,
];

export const allChains = { 
  '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42': { addressPrefix: 0 } 
};

export const syncResult = {
  accounts: [syncMultisig1, syncMultisig2, syncMultisig3],
  chains: ['0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42'],
  indexedBlocks,
};