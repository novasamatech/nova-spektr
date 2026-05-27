import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { skipModel } from '../skip-model';

describe('skip-model', () => {
  it('adds key on skip', async () => {
    const scope = fork();
    await allSettled(skipModel.skip, { scope, params: 'draft:1' });
    expect(scope.getState(skipModel.$skipped)).toEqual(['draft:1']);
  });

  it('is idempotent', async () => {
    const scope = fork();
    await allSettled(skipModel.skip, { scope, params: 'draft:1' });
    await allSettled(skipModel.skip, { scope, params: 'draft:1' });
    expect(scope.getState(skipModel.$skipped)).toEqual(['draft:1']);
  });

  it('removes key on unskip', async () => {
    const scope = fork({ values: [[skipModel.$skipped, ['draft:1', 'multisig:2']]] });
    await allSettled(skipModel.unskip, { scope, params: 'draft:1' });
    expect(scope.getState(skipModel.$skipped)).toEqual(['multisig:2']);
  });
});
