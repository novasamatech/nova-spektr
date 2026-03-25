import { createFeature } from '@/shared/feature';
import { dashboardPresetSwitcherSlot } from '@/pages/Dashboard';

import { PresetSegmentSwitcher } from './ui/PresetSegmentSwitcher';

const dashboardPresetsFeature = createFeature({
  name: 'dashboard/presets',
});

dashboardPresetsFeature.inject(dashboardPresetSwitcherSlot, {
  render: PresetSegmentSwitcher,
});

export { dashboardPresetsFeature };
