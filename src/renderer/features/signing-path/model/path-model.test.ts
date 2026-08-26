import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

import { pathModel } from './path-model';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;
const multisig = (n: number): PathNode => ({ kind: 'multisig', accountId: acc(n) });
const signer = (n: number): PathNode => ({ kind: 'signer', accountId: acc(n) });
const proxied = (n: number): PathNode => ({ kind: 'proxied', accountId: acc(n) });

describe('path-model', () => {
  it('starts with empty path', () => {
    const scope = fork();
    expect(scope.getState(pathModel.$path)).toEqual([]);
    expect(scope.getState(pathModel.$isComplete)).toBe(false);
  });

  it('pathReset clears the path', async () => {
    const scope = fork({ values: new Map([[pathModel.$path, [multisig(1)]]]) });
    await allSettled(pathModel.pathReset, { scope });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('pathNodeAppended appends a node', async () => {
    const scope = fork();
    await allSettled(pathModel.pathNodeAppended, { scope, params: multisig(1) });
    expect(scope.getState(pathModel.$path)).toEqual([multisig(1)]);
  });

  it('pathNodeAppended no-ops on cycle', async () => {
    const scope = fork({ values: new Map([[pathModel.$path, [multisig(1)]]]) });
    await allSettled(pathModel.pathNodeAppended, { scope, params: multisig(1) });
    expect(scope.getState(pathModel.$path)).toEqual([multisig(1)]);
  });

  it('pathTruncatedTo keeps [0..i] inclusive', async () => {
    const scope = fork({
      values: new Map([[pathModel.$path, [proxied(1), multisig(2), multisig(3), signer(4)]]]),
    });
    await allSettled(pathModel.pathTruncatedTo, { scope, params: 1 });
    expect(scope.getState(pathModel.$path)).toEqual([proxied(1), multisig(2)]);
  });

  it('pathTruncatedTo clamps upper bound', async () => {
    const scope = fork({ values: new Map([[pathModel.$path, [multisig(1), signer(2)]]]) });
    await allSettled(pathModel.pathTruncatedTo, { scope, params: 99 });
    expect(scope.getState(pathModel.$path)).toEqual([multisig(1), signer(2)]);
  });

  it('pathTruncatedTo with negative index clears', async () => {
    const scope = fork({ values: new Map([[pathModel.$path, [multisig(1), signer(2)]]]) });
    await allSettled(pathModel.pathTruncatedTo, { scope, params: -1 });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('$isComplete reflects ending in signer', async () => {
    const scope = fork();
    await allSettled(pathModel.pathSeeded, { scope, params: [multisig(1), signer(2)] });
    expect(scope.getState(pathModel.$isComplete)).toBe(true);
  });

  it('pathSeeded rejects invalid path', async () => {
    const scope = fork();
    await allSettled(pathModel.pathSeeded, { scope, params: [signer(1), signer(2)] });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('pathSeeded accepts a lone signer', async () => {
    const scope = fork();
    await allSettled(pathModel.pathSeeded, { scope, params: [signer(1)] });
    expect(scope.getState(pathModel.$path)).toEqual([signer(1)]);
  });

  it('pathSeeded accepts a valid prefix (proxied → multisig)', async () => {
    const scope = fork();
    await allSettled(pathModel.pathSeeded, { scope, params: [proxied(1), multisig(2)] });
    expect(scope.getState(pathModel.$path)).toEqual([proxied(1), multisig(2)]);
    expect(scope.getState(pathModel.$isComplete)).toBe(false);
  });

  it('depth cap — refuses to append past MAX_PATH_DEPTH', async () => {
    const scope = fork({
      values: new Map([
        [pathModel.$path, [multisig(1), multisig(2), multisig(3), multisig(4), multisig(5), multisig(6)]],
      ]),
    });
    await allSettled(pathModel.pathNodeAppended, { scope, params: signer(7) });
    expect(scope.getState(pathModel.$path)).toHaveLength(6);
  });
});
