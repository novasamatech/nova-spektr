import { allSettled, fork } from 'effector';
import { describe, it } from 'vitest';

import { createComplexFlag } from './createComplexFlag';

describe('createComplexFlag', () => {
  it('should switch sigle flag', async () => {
    const scope = fork();
    const { $flag, enable, disable } = createComplexFlag({ reasons: ['low'] });

    await allSettled(enable, { params: 'low', scope });
    expect(scope.getState($flag)).toBeTruthy();

    await allSettled(disable, { params: 'low', scope });
    expect(scope.getState($flag)).toBeFalsy();
  });

  it('should flip flag with lower priority', async () => {
    const scope = fork();
    const { $flag, enable, disable } = createComplexFlag({ reasons: ['high', 'low'] });

    await allSettled(enable, { params: 'low', scope });
    expect(scope.getState($flag)).toBeTruthy();

    await allSettled(enable, { params: 'high', scope });
    expect(scope.getState($flag)).toBeTruthy();

    await allSettled(disable, { params: 'high', scope });
    expect(scope.getState($flag)).toBeFalsy();
  });

  it('should keep truthy state when flag with lower priority turns off', async () => {
    const scope = fork();
    const { $flag, enable, disable } = createComplexFlag({ reasons: ['high', 'low'] });

    await allSettled(enable, { params: 'low', scope });
    await allSettled(enable, { params: 'high', scope });
    expect(scope.getState($flag)).toBeTruthy();

    await allSettled(disable, { params: 'low', scope });
    expect(scope.getState($flag)).toBeTruthy();
  });
});
