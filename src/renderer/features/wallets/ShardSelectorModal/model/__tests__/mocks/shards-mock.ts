import {
  AccountType,
  BaseAccount,
  ChainAccount,
  ShardAccount,
  PolkadotVaultWallet,
  MultiShardWallet,
  SigningType,
  WalletType,
} from '@shared/core';

const vaultWallet: PolkadotVaultWallet = {
  id: 1,
  isActive: true,
  name: 'My Vault wallet',
  signingType: SigningType.POLKADOT_VAULT,
  type: WalletType.POLKADOT_VAULT,
};

const multishardWallet: MultiShardWallet = {
  id: 2,
  isActive: true,
  name: 'My Multishard wallet',
  signingType: SigningType.POLKADOT_VAULT,
  type: WalletType.MULTISHARD_PARITY_SIGNER,
};

const vaultAccounts = [
  {
    id: 2,
    walletId: 1,
    name: 'Shard_1 WND key',
    groupId: 'shard_1',
    type: AccountType.SHARD,
    accountId: '0x18164fa6f9ce28792fb781185e8de4e6eaae34c0f545e5864952fe23c183df0c',
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    derivationPath: '//westend//hot//0',
  },
  {
    id: 3,
    walletId: 1,
    name: 'Shard_2 WND key',
    groupId: 'shard_1',
    type: AccountType.SHARD,
    accountId: '0xa8ceab88b82d857d3e64a8d67db0d3e476054a42572522ae359b962b2818305f',
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    derivationPath: '//westend//hot//1',
  },
  {
    id: 4,
    walletId: 1,
    name: 'Main KSM key',
    type: AccountType.CHAIN,
    accountId: '0x04b42c45250880695e6cec68c5adce35a0e2ec60ed46b77b734ad6020b991658',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    derivationPath: '//kusama//pub',
  },
  {
    id: 5,
    walletId: 1,
    name: 'Main DOT key',
    type: AccountType.CHAIN,
    accountId: '0x661127faa225949b1c1a48f834f43fa626c9f58fa0c7e522551d4b9616e18c37',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    derivationPath: '//polkadot//main',
  },
  {
    id: 1,
    walletId: 1,
    name: 'My ROOT',
    type: AccountType.BASE,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
  },
] as unknown as Array<BaseAccount | ChainAccount | ShardAccount>;

const multishardAccounts = [
  {
    id: 2,
    baseId: 1,
    walletId: 2,
    name: 'Main KSM key',
    type: AccountType.CHAIN,
    accountId: '0x04b42c45250880695e6cec68c5adce35a0e2ec60ed46b77b734ad6020b991658',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    derivationPath: '//kusama//pub',
  },
  {
    id: 3,
    baseId: 1,
    walletId: 2,
    name: 'Main DOT key',
    type: AccountType.CHAIN,
    accountId: '0x661127faa225949b1c1a48f834f43fa626c9f58fa0c7e522551d4b9616e18c37',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    derivationPath: '//polkadot//main',
  },
  {
    id: 1,
    walletId: 2,
    name: 'My First ROOT',
    type: AccountType.BASE,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
  },
  {
    id: 5,
    baseId: 4,
    walletId: 2,
    name: 'Second WND key',
    type: AccountType.CHAIN,
    accountId: '0xa8ceab88b82d857d3e64a8d67db0d3e476054a42572522ae359b962b2818305f',
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    derivationPath: '//westend//pub',
  },
  {
    id: 6,
    baseId: 4,
    walletId: 2,
    name: 'Second ACA key',
    type: AccountType.CHAIN,
    accountId: '0x04b42c45250880695e6cec68c5adce35a0e2ec60ed46b77b734ad6020b991658',
    chainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
    derivationPath: '//acala//main',
  },
  {
    id: 4,
    walletId: 2,
    name: 'My Second ROOT',
    type: AccountType.BASE,
    accountId: '0x5a920a698b26cc691faf5ee41b454581348f8a68cce99c84c7fb82ce87605340',
  },
] as unknown as Array<BaseAccount | ChainAccount>;

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

export const shardsMock = {
  vaultWallet,
  multishardWallet,
  vaultAccounts,
  multishardAccounts,
  chainsMap,
};
