import { allSettled, fork } from 'effector';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as backendDomain from '@/domains/backend';
import { operationDescriptionsResource } from '@/domains/backend';
import { backendConfigurationModel } from '@/aggregates/backend';

describe('operationDescriptionsResource', () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    fetchSpy = vi.spyOn(backendDomain.operationsService, 'fetchDescriptionsByIds').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store descriptions from fetch results', async () => {
    fetchSpy.mockResolvedValue([
      { id: 'op-1', description: 'Test description' },
      { id: 'op-2', description: null },
    ]);

    const scope = fork();

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-1', 'op-2'] },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-1': 'Test description',
    });
  });

  it('should merge descriptions from multiple fetches', async () => {
    fetchSpy.mockResolvedValueOnce([{ id: 'op-1', description: 'First' }]);

    const scope = fork();

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-1'] },
    });

    fetchSpy.mockResolvedValueOnce([{ id: 'op-2', description: 'Second' }]);

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-2'] },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-1': 'First',
      'op-2': 'Second',
    });
  });

  it('should optimistically update cache on descriptionCreated', async () => {
    const scope = fork();

    await allSettled(operationDescriptionsResource.descriptionCreated, {
      scope,
      params: { id: 'op-new', description: 'Optimistic' },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-new': 'Optimistic',
    });
  });

  it('should clear cache on resetDescriptions', async () => {
    const scope = fork();

    await allSettled(operationDescriptionsResource.descriptionCreated, {
      scope,
      params: { id: 'op-1', description: 'desc' },
    });
    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({ 'op-1': 'desc' });

    await allSettled(operationDescriptionsResource.resetDescriptions, { scope });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({});
  });

  it('should clear cache when urlCleared fires', async () => {
    const scope = fork();

    await allSettled(operationDescriptionsResource.descriptionCreated, {
      scope,
      params: { id: 'op-1', description: 'desc' },
    });
    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({ 'op-1': 'desc' });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({});
  });
});
