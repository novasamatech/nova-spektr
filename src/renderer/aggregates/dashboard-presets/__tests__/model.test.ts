import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { dashboardPresetsModel } from '../model';

describe('dashboardPresetsModel', () => {
  it('creates a preset with generated id', async () => {
    const scope = fork();
    await allSettled(dashboardPresetsModel.presetCreated, {
      scope,
      params: { name: 'Work', filters: { sources: ['wallet'], entityNames: [], categoryNames: [], tags: [] } },
    });
    const presets = scope.getState(dashboardPresetsModel.$presets);
    expect(presets).toHaveLength(1);
    expect(presets[0]!.name).toBe('Work');
    expect(presets[0]!.filters.sources).toEqual(['wallet']);
    expect(presets[0]!.id).toBeTruthy();
  });

  it('trims and limits preset name to 30 chars', async () => {
    const scope = fork();
    await allSettled(dashboardPresetsModel.presetCreated, {
      scope,
      params: {
        name: '  A very long preset name that exceeds the limit  ',
        filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
      },
    });
    const presets = scope.getState(dashboardPresetsModel.$presets);
    expect(presets[0]!.name).toBe('A very long preset name that e');
    expect(presets[0]!.name.length).toBeLessThanOrEqual(30);
  });

  it('updates a preset', async () => {
    const scope = fork({
      values: [
        [
          dashboardPresetsModel.$presets,
          [
            {
              id: '1',
              name: 'Old',
              filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
            },
          ],
        ],
      ],
    });
    await allSettled(dashboardPresetsModel.presetUpdated, { scope, params: { id: '1', name: 'New' } });
    expect(scope.getState(dashboardPresetsModel.$presets)[0]!.name).toBe('New');
  });

  it('deletes a preset', async () => {
    const scope = fork({
      values: [
        [
          dashboardPresetsModel.$presets,
          [
            {
              id: '1',
              name: 'X',
              filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
            },
          ],
        ],
      ],
    });
    await allSettled(dashboardPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$presets)).toHaveLength(0);
  });

  it('switches to All when active preset is deleted', async () => {
    const scope = fork({
      values: [
        [
          dashboardPresetsModel.$presets,
          [
            {
              id: '1',
              name: 'X',
              filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
            },
          ],
        ],
        [dashboardPresetsModel.$activePresetId, '1'],
      ],
    });
    await allSettled(dashboardPresetsModel.presetDeleted, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$activePresetId)).toBeNull();
  });

  it('activates a preset by setting activePresetId', async () => {
    const scope = fork({
      values: [
        [
          dashboardPresetsModel.$presets,
          [
            {
              id: '1',
              name: 'A',
              filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
            },
          ],
        ],
      ],
    });
    await allSettled(dashboardPresetsModel.presetActivated, { scope, params: '1' });
    expect(scope.getState(dashboardPresetsModel.$activePresetId)).toBe('1');
  });

  it('segments show first 3 in creation order', async () => {
    const presets = [
      {
        id: '1',
        name: 'A',
        filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
        lastActivatedAt: 100,
      },
      {
        id: '2',
        name: 'B',
        filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
      },
      {
        id: '3',
        name: 'C',
        filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
      },
      {
        id: '4',
        name: 'D',
        filters: { sources: [], entityNames: [], categoryNames: [], tags: [] },
      },
    ];
    const scope = fork({ values: [[dashboardPresetsModel.$presets, presets]] });
    const segments = scope.getState(dashboardPresetsModel.$segmentPresets);
    expect(segments.map(p => p.name)).toEqual(['A', 'B', 'C']);
    const overflow = scope.getState(dashboardPresetsModel.$overflowPresets);
    expect(overflow.map(p => p.name)).toEqual(['D']);
  });
});
