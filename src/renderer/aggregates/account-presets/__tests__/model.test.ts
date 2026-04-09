import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { accountPresetsModel } from '../model';
import { EMPTY_FILTERS } from '../types';

const filterPreset = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: overrides.id ?? '1',
  name: overrides.name ?? 'Test',
  type: 'filter' as const,
  filters: EMPTY_FILTERS,
  selectedIds: [],
});

describe('accountPresetsModel', () => {
  it('creates a filter preset with generated id', async () => {
    const scope = fork();
    await allSettled(accountPresetsModel.presetCreated, {
      scope,
      params: {
        name: 'Work',
        type: 'filter',
        filters: { sources: ['wallet'], entityNames: [], categoryNames: [], tags: [] },
        selectedIds: [],
      },
    });
    const presets = scope.getState(accountPresetsModel.$presets);
    expect(presets).toHaveLength(1);
    expect(presets[0]!.name).toBe('Work');
    expect(presets[0]!.type).toBe('filter');
    expect(presets[0]!.filters.sources).toEqual(['wallet']);
    expect(presets[0]!.id).toBeTruthy();
  });

  it('creates a custom preset with selectedIds', async () => {
    const scope = fork();
    await allSettled(accountPresetsModel.presetCreated, {
      scope,
      params: { name: 'Custom', type: 'custom', filters: EMPTY_FILTERS, selectedIds: ['a1', 'a2'] },
    });
    const presets = scope.getState(accountPresetsModel.$presets);
    expect(presets).toHaveLength(1);
    expect(presets[0]!.type).toBe('custom');
    expect(presets[0]!.selectedIds).toEqual(['a1', 'a2']);
  });

  it('trims and limits preset name to 30 chars', async () => {
    const scope = fork();
    await allSettled(accountPresetsModel.presetCreated, {
      scope,
      params: {
        name: '  A very long preset name that exceeds the limit  ',
        type: 'filter',
        filters: EMPTY_FILTERS,
        selectedIds: [],
      },
    });
    const presets = scope.getState(accountPresetsModel.$presets);
    expect(presets[0]!.name).toBe('A very long preset name that e');
    expect(presets[0]!.name.length).toBeLessThanOrEqual(30);
  });

  it('updates a preset', async () => {
    const scope = fork({
      values: [[accountPresetsModel.$presets, [filterPreset()]]],
    });
    await allSettled(accountPresetsModel.presetUpdated, { scope, params: { id: '1', name: 'New' } });
    expect(scope.getState(accountPresetsModel.$presets)[0]!.name).toBe('New');
  });

  it('deletes a preset', async () => {
    const scope = fork({
      values: [[accountPresetsModel.$presets, [filterPreset()]]],
    });
    await allSettled(accountPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(accountPresetsModel.$presets)).toHaveLength(0);
  });

  it('clears dashboard active preset when it is deleted', async () => {
    const scope = fork({
      values: [
        [accountPresetsModel.$presets, [filterPreset()]],
        [accountPresetsModel.$activeDashboardPresetId, '1'],
      ],
    });
    await allSettled(accountPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(accountPresetsModel.$activeDashboardPresetId)).toBeNull();
  });

  it('clears operations active preset when it is deleted', async () => {
    const scope = fork({
      values: [
        [accountPresetsModel.$presets, [filterPreset()]],
        [accountPresetsModel.$activeOperationsPresetId, '1'],
      ],
    });
    await allSettled(accountPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(accountPresetsModel.$activeOperationsPresetId)).toBeNull();
  });

  it('activates the dashboard preset without touching operations preset', async () => {
    const scope = fork({
      values: [
        [accountPresetsModel.$presets, [filterPreset({ id: '1' }), filterPreset({ id: '2', name: 'Other' })]],
        [accountPresetsModel.$activeOperationsPresetId, '2'],
      ],
    });
    await allSettled(accountPresetsModel.dashboardPresetActivated, { scope, params: '1' });
    expect(scope.getState(accountPresetsModel.$activeDashboardPresetId)).toBe('1');
    expect(scope.getState(accountPresetsModel.$activeOperationsPresetId)).toBe('2');
  });

  it('activates the operations preset without touching dashboard preset', async () => {
    const scope = fork({
      values: [
        [accountPresetsModel.$presets, [filterPreset({ id: '1' }), filterPreset({ id: '2', name: 'Other' })]],
        [accountPresetsModel.$activeDashboardPresetId, '1'],
      ],
    });
    await allSettled(accountPresetsModel.operationsPresetActivated, { scope, params: '2' });
    expect(scope.getState(accountPresetsModel.$activeOperationsPresetId)).toBe('2');
    expect(scope.getState(accountPresetsModel.$activeDashboardPresetId)).toBe('1');
  });

  it('segments show first 3 in creation order', async () => {
    const presets = [
      filterPreset({ id: '1', name: 'A' }),
      filterPreset({ id: '2', name: 'B' }),
      filterPreset({ id: '3', name: 'C' }),
      filterPreset({ id: '4', name: 'D' }),
    ];
    const scope = fork({ values: [[accountPresetsModel.$presets, presets]] });
    expect(scope.getState(accountPresetsModel.$segmentPresets).map(p => p.name)).toEqual(['A', 'B', 'C']);
    expect(scope.getState(accountPresetsModel.$overflowPresets).map(p => p.name)).toEqual(['D']);
  });
});
