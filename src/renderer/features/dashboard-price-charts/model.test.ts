import { allSettled, fork } from 'effector';
import { describe, expect, test } from 'vitest';

import { $trackedPriceIds, tokenAdded, tokenRemoved } from './model';

describe('dashboard-price-charts model', () => {
  test('should have default tracked ids', () => {
    const scope = fork();
    expect(scope.getState($trackedPriceIds)).toEqual(['polkadot', 'kusama']);
  });

  test('should add a new token', async () => {
    const scope = fork();
    await allSettled(tokenAdded, { scope, params: 'tether' });
    expect(scope.getState($trackedPriceIds)).toEqual(['polkadot', 'kusama', 'tether']);
  });

  test('should not add duplicate token', async () => {
    const scope = fork();
    await allSettled(tokenAdded, { scope, params: 'polkadot' });
    expect(scope.getState($trackedPriceIds)).toEqual(['polkadot', 'kusama']);
  });

  test('should remove a token', async () => {
    const scope = fork();
    await allSettled(tokenRemoved, { scope, params: 'kusama' });
    expect(scope.getState($trackedPriceIds)).toEqual(['polkadot']);
  });

  test('should handle removing nonexistent token', async () => {
    const scope = fork();
    await allSettled(tokenRemoved, { scope, params: 'nonexistent' });
    expect(scope.getState($trackedPriceIds)).toEqual(['polkadot', 'kusama']);
  });
});
