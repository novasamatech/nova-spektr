import { KeyType, AccountType, CryptoType, ChainType } from '@shared/core';

const defaultKeys = [
  {
    name: 'Main DOT key',
    keyType: KeyType.MAIN,
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    derivationPath: '//polkadot//MAIN',
  },
  {
    name: 'Shard_1 DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//0',
  },
  {
    name: 'Shard_2 DOT key',
    groupId: 'shard_1',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    keyType: KeyType.PUBLIC,
    type: AccountType.SHARD,
    derivationPath: '//polkadot//hot//1',
  },
];

const customKey = {
  name: 'custom key',
  keyType: KeyType.CUSTOM,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  type: AccountType.CHAIN,
  cryptoType: CryptoType.SR25519,
  chainType: ChainType.SUBSTRATE,
  derivationPath: '//polkadot//custom',
  id: 1,
  walletId: 1,
  accountId: '0x00',
};

const chainsMap = {
  '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
    name: 'Polkadot',
    specName: 'polkadot',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    addressPrefix: 0,
  },
  '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': {
    name: 'Kusama',
    specName: 'kusama',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    addressPrefix: 2,
  },
  '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c': {
    name: 'Acala',
    specName: 'acala',
    chainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    addressPrefix: 10,
  },
  '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': {
    name: 'Westend',
    specName: 'westend',
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    addressPrefix: 42,
  },
};

export const constructorMock = {
  defaultKeys,
  chainsMap,
  customKey,
};
