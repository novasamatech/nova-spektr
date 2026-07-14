import { type Scope, allSettled, fork } from 'effector';

import { type ChainId } from '@/shared/core';
import { DerivationError } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { type DerivationKeyDraft, constructorModel } from '../constructor-model';

const POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const ACALA = '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c' as ChainId;
const KUSAMA = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId;
const MOONBEAM = '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d' as ChainId;
const MOONRIVER = '0x401a1f0dca443ca827ae6c1f9c8d4c07f7ab6e0af6f0f18f3f6b0b0b0b0b0b0b' as ChainId;

const chainsMap = {
  [POLKADOT]: { name: 'Polkadot', chainId: POLKADOT },
  // Parachain of Polkadot — shares the relay chain with POLKADOT
  [ACALA]: { name: 'Acala', chainId: ACALA, parentId: POLKADOT },
  [KUSAMA]: { name: 'Kusama', chainId: KUSAMA },
  [MOONBEAM]: { name: 'Moonbeam', chainId: MOONBEAM, parentId: POLKADOT, options: ['ethereum_based'] },
  [MOONRIVER]: { name: 'Moonriver', chainId: MOONRIVER, parentId: KUSAMA, options: ['ethereum_based'] },
};

/** Seeds $keys with the given drafts, keyed by index, and validates each one. */
async function validateAll(keys: DerivationKeyDraft[]): Promise<Scope> {
  const keysMap = Object.fromEntries(keys.map((key, index) => [index.toString(), key]));

  const scope = fork({
    values: new Map().set(networkModel.$chains, chainsMap).set(constructorModel.$keys, keysMap),
  });

  for (const keyId of Object.keys(keysMap)) {
    await allSettled(constructorModel.validateKey, { scope, params: keyId });
  }

  return scope;
}

function getErrors(scope: Scope, keyIndex: number): DerivationError[] {
  return scope.getState(constructorModel.$errors)[keyIndex.toString()] ?? [];
}

describe('features/wallets/KeyConstructor/model/constructor-model', () => {
  test('should report DUPLICATE for the same derivation path on the same chain', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: POLKADOT, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([DerivationError.DUPLICATE]);
    expect(getErrors(scope, 1)).toEqual([DerivationError.DUPLICATE]);
  });

  test('should allow the same derivation path on different chains', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: KUSAMA, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([]);
    expect(getErrors(scope, 1)).toEqual([]);
  });

  test('should allow the same derivation path on a relay chain and its parachain', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: ACALA, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([]);
    expect(getErrors(scope, 1)).toEqual([]);
  });

  test('should allow the same derivation path on two different ethereum based chains', async () => {
    const scope = await validateAll([
      { chainId: MOONBEAM, derivationPath: '//staking' },
      { chainId: MOONRIVER, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([]);
    expect(getErrors(scope, 1)).toEqual([]);
  });

  test('should report DUPLICATE on the same ethereum based chain', async () => {
    const scope = await validateAll([
      { chainId: MOONBEAM, derivationPath: '//staking' },
      { chainId: MOONBEAM, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([DerivationError.DUPLICATE]);
    expect(getErrors(scope, 1)).toEqual([DerivationError.DUPLICATE]);
  });

  test('should clear DUPLICATE on both keys once one of them moves to another chain', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: POLKADOT, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 0)).toEqual([DerivationError.DUPLICATE]);
    expect(getErrors(scope, 1)).toEqual([DerivationError.DUPLICATE]);

    await allSettled(constructorModel.updateKey, { scope, params: ['1', { chainId: KUSAMA }] });

    expect(getErrors(scope, 0)).toEqual([]);
    expect(getErrors(scope, 1)).toEqual([]);
  });

  test('should report DUPLICATE once a key moves onto a chain that already holds the path', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: KUSAMA, derivationPath: '//staking' },
    ]);

    expect(getErrors(scope, 1)).toEqual([]);

    await allSettled(constructorModel.updateKey, { scope, params: ['1', { chainId: POLKADOT }] });

    expect(getErrors(scope, 0)).toEqual([DerivationError.DUPLICATE]);
    expect(getErrors(scope, 1)).toEqual([DerivationError.DUPLICATE]);
  });

  test('should drop errors of a removed key', async () => {
    const scope = await validateAll([
      { chainId: POLKADOT, derivationPath: '//staking' },
      { chainId: POLKADOT, derivationPath: '//staking' },
    ]);

    await allSettled(constructorModel.removeKey, { scope, params: '1' });

    expect(scope.getState(constructorModel.$errors)).not.toHaveProperty('1');
    expect(getErrors(scope, 0)).toEqual([]);
  });
});
