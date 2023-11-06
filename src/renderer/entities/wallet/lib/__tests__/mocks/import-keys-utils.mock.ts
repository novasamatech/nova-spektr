import { ChainId, KeyType } from '@renderer/shared/core';
import { TypedImportedDerivation } from '../../types';

const chainId: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

const invalidDerivations = {
  passwordPath: {
    derivationPath: '//polkadot///dsfsdf',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  invalidPath: {
    derivationPath: '//polkadot//staking/',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  emptyPath: {
    derivationPath: '',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  tooManyShards: {
    derivationPath: '//path',
    type: KeyType.MAIN,
    chainId: chainId,
    sharded: '60',
  },
  wrongShardedType: {
    derivationPath: '//path',
    type: KeyType.HOT,
    chainId: chainId,
    sharded: '10',
  },
  wrongKeyType: {
    derivationPath: '//path',
    type: 'wrong_type',
    chainId: chainId,
  },
};

const validDerivations = [
  {
    derivationPath: '//polkadot',
    type: KeyType.PUBLIC,
    chainId: chainId,
  },
  {
    derivationPath: '//staking',
    type: KeyType.STAKING,
    chainId: chainId,
    sharded: '10',
  },
];

const existingChainDerivations: TypedImportedDerivation[] = [
  {
    derivationPath: '//polkadot',
    type: KeyType.MAIN,
    chainId: chainId,
  },
  {
    derivationPath: '//polkadot//staking//some_key',
    type: KeyType.STAKING,
    chainId: chainId,
  },
  {
    derivationPath: '//polkadot//staking',
    type: KeyType.STAKING,
    chainId: chainId,
    sharded: 10,
  },
];

export const importKeysMocks = {
  chainId,
  invalidDerivations,
  validDerivations,
  existingChainDerivations,
};
