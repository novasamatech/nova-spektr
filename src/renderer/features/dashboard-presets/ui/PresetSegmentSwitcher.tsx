import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includes } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton } from '@/shared/ui';
import { Popover, SearchInput, Tabs } from '@/shared/ui-kit';
import { dashboardPresetsModel } from '@/aggregates/dashboard-presets';
import { PresetManagementModal } from '@/widgets/PresetManagementModal';

const ALL_VALUE = '__all__';

export const PresetSegmentSwitcher = () => {
  const { t } = useI18n();
  const activePresetId = useUnit(dashboardPresetsModel.$activePresetId);
  const segmentPresets = useUnit(dashboardPresetsModel.$segmentPresets);
  const overflowPresets = useUnit(dashboardPresetsModel.$overflowPresets);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const hasOverflow = overflowPresets.length > 0;

  const filteredOverflow = useMemo(
    () => overflowPresets.filter((p) => includes(p.name, search)),
    [overflowPresets, search],
  );

  const handleTabChange = useCallback((value: string) => {
    dashboardPresetsModel.presetActivated(value === ALL_VALUE ? null : value);
  }, []);

  const handleOverflowActivate = useCallback((id: string) => {
    dashboardPresetsModel.presetActivated(id);
    setOverflowOpen(false);
    setSearch('');
  }, []);

  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
    setOverflowOpen(false);
  }, []);

  const handleCloseModal = useCallback(() => setModalOpen(false), []);
  const handleOpenSettings = useCallback(() => setModalOpen(true), []);

  const tabValue = activePresetId ?? ALL_VALUE;

  return (
    <>
      <div className="flex items-center gap-x-1">
        <div className="[&_[role=tablist]]:mb-0">
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Trigger value={ALL_VALUE}>{t('dashboard.presets.all')}</Tabs.Trigger>
              {segmentPresets.map((preset) => (
                <Tabs.Trigger key={preset.id} value={preset.id}>
                  {preset.name}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        </div>

        {hasOverflow ? (
          <Popover open={overflowOpen} align="end" side="bottom" onToggle={setOverflowOpen}>
            <Popover.Trigger>
              <button
                type="button"
                className="rounded-md bg-tab-background px-3 py-1.5 text-footnote text-text-secondary transition-colors hover:bg-action-background-hover"
              >
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {'▾ ' + String(overflowPresets.length)}
              </button>
            </Popover.Trigger>
            <Popover.Content>
              <div className="w-[220px] p-1">
                <div className="px-2 pt-2 pb-1">
                  <SearchInput value={search} placeholder={t('dashboard.presets.searchPresets')} onChange={setSearch} />
                </div>
                <div className="mt-1 max-h-48 overflow-y-auto">
                  {filteredOverflow.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={cnTw(
                        'flex w-full items-center rounded px-2 py-1.5 text-left transition-colors hover:bg-action-background-hover',
                        activePresetId === preset.id && 'border-l-2 border-icon-accent bg-block-background-default',
                      )}
                      onClick={() => handleOverflowActivate(preset.id)}
                    >
                      <FootnoteText className="text-text-primary">{preset.name}</FootnoteText>
                    </button>
                  ))}
                </div>
                <div className="mt-1 border-t border-divider pt-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-x-1.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-action-background-hover"
                    onClick={handleOpenModal}
                  >
                    <Icon name="settingsLite" size={14} className="text-icon-default" />
                    <FootnoteText className="text-text-secondary">{t('dashboard.presets.manage')}</FootnoteText>
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover>
        ) : (
          <IconButton name="settingsLite" onClick={handleOpenSettings} />
        )}
      </div>
      <PresetManagementModal isOpen={modalOpen} onClose={handleCloseModal} />
    </>
  );
};
