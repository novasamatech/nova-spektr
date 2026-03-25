import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { dashboardPresetsModel } from '../model';
import { EMPTY_FILTERS } from '../types';

const filterPreset = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: overrides.id ?? '1',
  name: overrides.name ?? 'Test',
  type: 'filter' as const,
  filters: EMPTY_FILTERS,
  selectedIds: [],
});

describe('dashboardPresetsModel', () => {
  it('creates a filter preset with generated id', async () => {
    const scope = fork();
    await allSettled(dashboardPresetsModel.presetCreated, {
      scope,
      params: {
        name: 'Work',
        type: 'filter',
        filters: { sources: ['wallet'], entityNames: [], categoryNames: [], tags: [] },
        selectedIds: [],
      },
    });
    const presets = scope.getState(dashboardPresetsModel.$presets);
    expect(presets).toHaveLength(1);
    expect(presets[0]!.name).toBe('Work');
    expect(presets[0]!.type).toBe('filter');
    expect(presets[0]!.filters.sources).toEqual(['wallet']);
    expect(presets[0]!.id).toBeTruthy();
  });

  it('creates a custom preset with selectedIds', async () => {
    const scope = fork();
    await allSettled(dashboardPresetsModel.presetCreated, {
      scope,
      params: { name: 'Custom', type: 'custom', filters: EMPTY_FILTERS, selectedIds: ['a1', 'a2'] },
    });
    const presets = scope.getState(dashboardPresetsModel.$presets);
    expect(presets).toHaveLength(1);
    expect(presets[0]!.type).toBe('custom');
    expect(presets[0]!.selectedIds).toEqual(['a1', 'a2']);
  });

  it('trims and limits preset name to 30 chars', async () => {
    const scope = fork();
    await allSettled(dashboardPresetsModel.presetCreated, {
      scope,
      params: {
        name: '  A very long preset name that exceeds the limit  ',
        type: 'filter',
        filters: EMPTY_FILTERS,
        selectedIds: [],
      },
    });
    const presets = scope.getState(dashboardPresetsModel.$presets);
    expect(presets[0]!.name).toBe('A very long preset name that e');
    expect(presets[0]!.name.length).toBeLessThanOrEqual(30);
  });

  it('updates a preset', async () => {
    const scope = fork({
      values: [[dashboardPresetsModel.$presets, [filterPreset()]]],
    });
    await allSettled(dashboardPresetsModel.presetUpdated, { scope, params: { id: '1', name: 'New' } });
    expect(scope.getState(dashboardPresetsModel.$presets)[0]!.name).toBe('New');
  });

  it('deletes a preset', async () => {
    const scope = fork({
      values: [[dashboardPresetsModel.$presets, [filterPreset()]]],
    });
    await allSettled(dashboardPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$presets)).toHaveLength(0);
  });

  it('switches to All when active preset is deleted', async () => {
    const scope = fork({
      values: [
        [dashboardPresetsModel.$presets, [filterPreset()]],
        [dashboardPresetsModel.$activePresetId, '1'],
      ],
    });
    await allSettled(dashboardPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$activePresetId)).toBeNull();
  });

  it('activates a preset by setting activePresetId', async () => {
    const scope = fork({
      values: [[dashboardPresetsModel.$presets, [filterPreset()]]],
    });
    await allSettled(dashboardPresetsModel.presetActivated, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$activePresetId)).toBe('1');
  });

  it('segments show first 3 in creation order', async () => {
    const presets = [
      filterPreset({ id: '1', name: 'A' }),
      filterPreset({ id: '2', name: 'B' }),
      filterPreset({ id: '3', name: 'C' }),
      filterPreset({ id: '4', name: 'D' }),
    ];
    const scope = fork({ values: [[dashboardPresetsModel.$presets, presets]] });
    expect(scope.getState(dashboardPresetsModel.$segmentPresets).map(p => p.name)).toEqual(['A', 'B', 'C']);
    expect(scope.getState(dashboardPresetsModel.$overflowPresets).map(p => p.name)).toEqual(['D']);
  });
});
