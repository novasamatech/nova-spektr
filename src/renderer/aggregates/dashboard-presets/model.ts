import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type AccountPreset, type PresetFilterCriteria, EMPTY_FILTERS } from './types';

const MAX_SEGMENTS = 3;

const presetCreated = createEvent<{ name: string; filters: PresetFilterCriteria }>();
const presetUpdated = createEvent<{ id: string; name?: string; filters?: PresetFilterCriteria }>();
const presetDeleted = createEvent<string>();
const presetActivated = createEvent<string | null>();

const $presets = createStore<AccountPreset[]>([]);
persist({ store: $presets, key: 'dashboard_presets', sync: true });

const $activePresetId = createStore<string | null>(null);
persist({ store: $activePresetId, key: 'dashboard_active_preset', sync: true });

$presets.on(presetCreated, (presets, { name, filters }) => [
  ...presets,
  {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 30),
    filters,
  },
]);

$presets.on(presetUpdated, (presets, { id, ...changes }) =>
  presets.map(p => (p.id === id ? { ...p, ...changes, name: changes.name?.trim().slice(0, 30) ?? p.name } : p)),
);

$presets.on(presetDeleted, (presets, id) => presets.filter(p => p.id !== id));

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

export { EMPTY_FILTERS };

export const dashboardPresetsModel = {
  $presets,
  $activePresetId,
  $activePreset,
  $segmentPresets,
  $overflowPresets,
  presetCreated,
  presetUpdated,
  presetDeleted,
  presetActivated,
};
