import {
  AccountType,
  ChainAccount,
  ChainId,
  ChainType,
  CryptoType,
  DraftAccount,
  KeyType,
  ShardAccount,
} from '@shared/core';
import { ImportedDerivation } from '../types';

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
  tooLittleShards: {
    derivationPath: '//path',
    type: KeyType.MAIN,
    chainId: chainId,
    sharded: '1',
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
  missingName: {
    derivationPath: '//path',
    type: 'custom',
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

const existingShardsGroupId = '1';
const existingShards: DraftAccount<ShardAccount>[] = [...Array(10).keys()].map((index) => ({
  groupId: existingShardsGroupId,
  name: '',
  chainType: ChainType.SUBSTRATE,
  cryptoType: CryptoType.SR25519,
  derivationPath: `//polkadot//staking//${index}`,
  type: AccountType.SHARD,
  keyType: KeyType.STAKING,
  chainId: chainId,
}));

const existingChainDerivations: DraftAccount<ShardAccount | ChainAccount>[] = [
  {
    name: '',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//polkadot',
    type: AccountType.CHAIN,
    keyType: KeyType.MAIN,
    chainId: chainId,
  },
  {
    name: '',
    chainType: ChainType.SUBSTRATE,
    cryptoType: CryptoType.SR25519,
    derivationPath: '//polkadot//staking//some_key',
    type: AccountType.CHAIN,
    keyType: KeyType.STAKING,
    chainId: chainId,
  },
  ...existingShards,
];

type ValidationTestData = {
  testName: string;
  derivation: ImportedDerivation;
  isValid: boolean;
};

const validationTestData: ValidationTestData[] = [
  {
    testName: 'Password path should not be allowed',
    derivation: invalidDerivations.passwordPath,
    isValid: false,
  },
  {
    testName: 'Path should math SR25519 format',
    derivation: invalidDerivations.invalidPath,
    isValid: false,
  },
  {
    testName: 'Path should not be empty',
    derivation: invalidDerivations.emptyPath,
    isValid: false,
  },
  {
    testName: 'Number of shards should be less than 50',
    derivation: invalidDerivations.tooManyShards,
    isValid: false,
  },
  {
    testName: 'Number of shards should be more than 1',
    derivation: invalidDerivations.tooLittleShards,
    isValid: false,
  },
  {
    testName: 'Sharded derivation should not be allowed for hot and public key',
    derivation: invalidDerivations.wrongShardedType,
    isValid: false,
  },
  {
    testName: 'Key type should match KeyType enum values',
    derivation: invalidDerivations.passwordPath,
    isValid: false,
  },
  {
    testName: 'Name is required for derivation with type custom',
    derivation: invalidDerivations.missingName,
    isValid: false,
  },
  {
    testName: 'Derivation should be valid (1)',
    derivation: validDerivations[0],
    isValid: true,
  },
  {
    testName: 'Derivation should be valid (2)',
    derivation: validDerivations[0],
    isValid: true,
  },
];

export const importKeysMocks = {
  chainId,
  invalidDerivations,
  validDerivations,
  existingChainDerivations,
  validationTestData,
  existingShardsGroupId,
};
