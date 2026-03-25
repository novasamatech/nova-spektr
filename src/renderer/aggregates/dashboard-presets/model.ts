import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type AccountPreset, type PresetFilterCriteria, type PresetType } from './types';

const MAX_SEGMENTS = 3;

type CreatePresetParams = {
  name: string;
  type: PresetType;
  filters: PresetFilterCriteria;
  selectedIds: string[];
};

type UpdatePresetParams = {
  id: string;
  name?: string;
  type?: PresetType;
  filters?: PresetFilterCriteria;
  selectedIds?: string[];
};

const presetCreated = createEvent<CreatePresetParams>();
const presetUpdated = createEvent<UpdatePresetParams>();
const presetDeleted = createEvent<string>();
const presetRestored = createEvent<{ preset: AccountPreset; index: number }>();
const presetActivated = createEvent<string | null>();
const presetsReordered = createEvent<string[]>();

const $presets = createStore<AccountPreset[]>([]);
persist({ store: $presets, key: 'dashboard_presets', sync: true });

const $activePresetId = createStore<string | null>(null);
persist({ store: $activePresetId, key: 'dashboard_active_preset', sync: true });

$presets.on(presetCreated, (presets, { name, type, filters, selectedIds }) => [
  ...presets,
  {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 30),
    type,
    filters,
    selectedIds,
  },
]);

$presets.on(presetUpdated, (presets, { id, name, type, filters, selectedIds }) =>
  presets.map(p => {
    if (p.id !== id) return p;

    return {
      ...p,
      ...(name !== undefined && { name: name.trim().slice(0, 30) }),
      ...(type !== undefined && { type }),
      ...(filters !== undefined && { filters }),
      ...(selectedIds !== undefined && { selectedIds }),
    };
  }),
);

$presets.on(presetDeleted, (presets, id) => presets.filter(p => p.id !== id));

$presets.on(presetRestored, (presets, { preset, index }) => {
  const next = [...presets];
  next.splice(index, 0, preset);

  return next;
});

$presets.on(presetsReordered, (presets, orderedIds) => {
  const byId = new Map(presets.map(p => [p.id, p]));
  return orderedIds.map(id => byId.get(id)).filter(Boolean) as AccountPreset[];
});

sample({
  clock: presetDeleted,
  source: $activePresetId,
  filter: (activeId, deletedId) => activeId === deletedId,
  fn: () => null,
  target: $activePresetId,
});

sample({
  clock: presetActivated,
  target: $activePresetId,
});

const $activePreset = combine($presets, $activePresetId, (presets, activeId) => {
  if (!activeId) return null;
  return presets.find(p => p.id === activeId) ?? null;
});

// Stable order — presets keep their creation order, no rearranging on select
const $segmentPresets = $presets.map(presets => presets.slice(0, MAX_SEGMENTS));

const $overflowPresets = $presets.map(presets => presets.slice(MAX_SEGMENTS));

export const dashboardPresetsModel = {
  $presets,
  $activePresetId,
  $activePreset,
  $segmentPresets,
  $overflowPresets,
  presetCreated,
  presetUpdated,
  presetDeleted,
  presetRestored,
  presetActivated,
  presetsReordered,
};
