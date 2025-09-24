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
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6146859,
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
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6146810,
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

export const proxiedAccount5 = {
  name: 'Any for pure 5FVYxS...jxhyAA',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0x97a7dfa455359b2081fbc7ea702df50ba0f629b549815a4b99f4b746c9256d83',
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
  walletId: 6,
  id: '6 0x97a7dfa455359b2081fbc7ea702df50ba0f629b549815a4b99f4b746c9256d83 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const proxiedAccount6 = {
  name: 'Any for pure 5FfoA3...qA9Yhj',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0x9f78211a490e9535ad0dd1a84ccc578f759ac0d13ab28d403512d56f651d358c',
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
  walletId: 7,
  id: '7 0x9f78211a490e9535ad0dd1a84ccc578f759ac0d13ab28d403512d56f651d358c 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount3 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '134EE...2GJcv',
  accountId: '0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9',
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6147631,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 70,
  id: '70 0x5aeeba99559557853750a805eaad43ce29a150a0b693502deac3fd2c0fee37b9 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount4 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '14Rr6...UtGeu',
  accountId: '0x97a7dfa455359b2081fbc7ea702df50ba0f629b549815a4b99f4b746c9256d83',
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6140430,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 71,
  id: '71 0x97a7dfa455359b2081fbc7ea702df50ba0f629b549815a4b99f4b746c9256d83 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount5 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '14c6J...gL2vw',
  accountId: '0x9f78211a490e9535ad0dd1a84ccc578f759ac0d13ab28d403512d56f651d358c',
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6146886,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 72,
  id: '72 0x9f78211a490e9535ad0dd1a84ccc578f759ac0d13ab28d403512d56f651d358c 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount6 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '14iSz...bND3X',
  accountId: '0xa45147b2c8b783718e17f6a0f9fef7d4f781f1062d1f18140dff667b22ba3dbe',
  multisigAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x74429a03af05da40e630c60e10d9454bae6f69449cb8dc4807e45ae4a14ac477' },
  ],
  deposit: '1002050000000',
  blockNumber: 6146940,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 73,
  id: '73 0xa45147b2c8b783718e17f6a0f9fef7d4f781f1062d1f18140dff667b22ba3dbe 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const flexMultisigAccount7 = {
  accountType: 'flex_multisig',
  type: 'chain',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  name: '15s2D...yBpPC',
  accountId: '0xd717455bf7a7eb2a4e680926f04fa16f4ec312b39f1a0f31a25d520fbdaf2c64',
  multisigAccountId: '0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda',
  threshold: 2,
  signatories: [
    { accountId: '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724' },
    { accountId: '0x8c5ad94502e0251b6e5ccc541b4e6a17ed533729fd78c0248b6958a992ea9d29' },
  ],
  deposit: '1002050000000',
  blockNumber: 6147644,
  extrinsicIndex: 2,
  cryptoType: 0,
  signingType: 'signing_ms',
  walletId: 74,
  id: '74 0xd717455bf7a7eb2a4e680926f04fa16f4ec312b39f1a0f31a25d520fbdaf2c64 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const proxiedAccount7 = {
  name: 'Any for pure 5Fn9ra...B5BoXY',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0xa45147b2c8b783718e17f6a0f9fef7d4f781f1062d1f18140dff667b22ba3dbe',
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
  walletId: 8,
  id: '8 0xa45147b2c8b783718e17f6a0f9fef7d4f781f1062d1f18140dff667b22ba3dbe 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
};

export const proxiedAccount8 = {
  name: 'Any for pure 5Gvj4j...hT1cUE',
  type: 'chain',
  accountType: 'proxied',
  accountId: '0xd717455bf7a7eb2a4e680926f04fa16f4ec312b39f1a0f31a25d520fbdaf2c64',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  proxyVariant: 'pure',
  cryptoType: 0,
  signingType: 'signing_wo',
  deposit: '1002050000000',
  connections: [
    {
      delay: 0,
      proxyAccountId: '0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda',
      proxyType: 'Any',
    },
  ],
  walletId: 9,
  id: '9 0xd717455bf7a7eb2a4e680926f04fa16f4ec312b39f1a0f31a25d520fbdaf2c64 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
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

export const syncProxy5 = {
  type: 'proxy',
  accountId: '0x97a7dfa455359b2081fbc7ea702df50ba0f629b549815a4b99f4b746c9256d83',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6140430,
  extrinsicIndex: 2,
};

export const syncProxy6 = {
  type: 'proxy',
  accountId: '0x9f78211a490e9535ad0dd1a84ccc578f759ac0d13ab28d403512d56f651d358c',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6146886,
  extrinsicIndex: 2,
};
export const syncProxy7 = {
  type: 'proxy',
  accountId: '0xa45147b2c8b783718e17f6a0f9fef7d4f781f1062d1f18140dff667b22ba3dbe',
  proxyAccountId: '0x651841e4f52831f5ef30c7fc4e0d9b97c53ac59bf58b79bf7b3ceaa44168f251',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6146940,
  extrinsicIndex: 2,
};
export const syncProxy8 = {
  type: 'proxy',
  accountId: '0xd717455bf7a7eb2a4e680926f04fa16f4ec312b39f1a0f31a25d520fbdaf2c64',
  proxyAccountId: '0x7bcbe9d650b189515f301cee672a214abcf38a0aaf8e7903da91e3d50fa2edda',
  chainId: '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
  deposit: '12345',
  delay: 0,
  proxyType: 'Any',
  proxyVariant: 'pure',
  blockNumber: 6147644,
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

export const flexMultisigWallet4 = {
  name: 'fourth wallet',
  type: 'wallet_fxms',
  id: 71,
  accounts: [flexMultisigAccount4],
};

export const flexMultisigWallet5 = {
  name: 'fifth wallet',
  type: 'wallet_fxms',
  id: 72,
  accounts: [flexMultisigAccount5],
};

export const flexMultisigWallet6 = {
  name: 'sixth wallet',
  type: 'wallet_fxms',
  id: 73,
  accounts: [flexMultisigAccount6],
};

export const flexMultisigWallet7 = {
  name: 'seventh wallet',
  type: 'wallet_fxms',
  id: 74,
  accounts: [flexMultisigAccount7],
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
  proxiedAccount5,
  proxiedAccount6,
  flexMultisigAccount1,
  flexMultisigAccount2,
  flexMultisigAccount3,
  flexMultisigAccount4,
  flexMultisigAccount5,
  flexMultisigAccount6,
  flexMultisigAccount7,
  proxiedAccount7,
  proxiedAccount8,
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
  flexMultisigWallet4,
  flexMultisigWallet5,
  flexMultisigWallet6,
  flexMultisigWallet7,
];

export const syncResult = {
  accounts: [
    syncMultisig1,
    syncMultisig2,
    syncProxy1,
    syncProxy2,
    syncProxy3,
    syncProxy4,
    syncProxy5,
    syncProxy6,
    syncProxy7,
    syncProxy8,
  ],
  chains: [
    '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
    '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
    '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
    '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
    '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
    '0x9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b',
    '0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755',
    '0xaa3876c1dc8a1afcc2e9a685a49ff7704cfd36ad8c90bf2702b9d1b00cc40011',
    '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21',
    '0xcd4d732201ebe5d6b014edda071c4203e16867305332301dc8d092044b28e554',
    '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
    '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
    '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
    '0x631ccc82a078481584041656af292834e1ae6daab61d2875b4dd0c14bb9b17bc',
    '0x1bf2a2ecb4a868de66ea8610f2ce7c8c43706561b6476031315f6640fe38e060',
    '0xcdedc8eadbfa209d3f207bba541e57c3c58a667b05a2e1d1e86353c9000758da',
    '0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82',
    '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d',
    '0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72',
    '0x1bb969d85965e4bb5a651abbedf21a54b6b31a21f66b5401cc3f1e286268d736',
    '0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e',
    '0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b',
    '0x2fc8bb6ed7c0051bdcf4866c322ed32b6276572713607e3297ccf411b8f14aa9',
    '0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e',
    '0xcceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf',
    '0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86',
    '0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03',
    '0xfe1b4c55fd4d668101126434206571a7838a8b6b93a6d1b95d607e78e6c53763',
    '0xdcf691b5a3fbe24adc99ddc959c0561b973e329b1aef4c4b22e7bb2ddecb4464',
    '0x00dcb981df86429de8bbacf9803401f09485366c44efbf53af9ecfab03adc7e5',
    '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2',
    '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008',
    '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f',
    '0x7eb9354488318e7549c722669dcbdcdc526f1fef1420e7944667212f3601fdbd',
    '0x0441383e31d1266a92b4cb2ddd4c2e3661ac476996db7e5844c52433b81fe782',
    '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9',
    '0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a',
    '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
    '0x1eb6fb0ba5187434de017a70cb84d4f47142df1d571d0ef9e7e1407f2b80b93c',
    '0xc84b77ebc80ef7413dbc04b6385b9ae7dff5811cfb2fd38025e67487389f666a',
    '0x713daf193a6301583ff467be736da27ef0a72711b248927ba413f573d2b38e44',
    '0xefb56e30d9b4a24099f88820987d0f45fb645992416535d87650d98e00f46fc4',
    '0x638cd2b9af4b3bb54b8c1f0d22711fc89924ca93300f0caf25a580432b29d050',
  ],
  indexedBlocks,
};
