import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { includes } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton } from '@/shared/ui';
import { Popover, SearchInput } from '@/shared/ui-kit';
import { dashboardPresetsModel } from '@/aggregates/dashboard-presets';
import { PresetManagementModal } from '@/widgets/PresetManagementModal';

export const PresetSegmentSwitcher = () => {
  const { t } = useI18n();
  const activePresetId = useUnit(dashboardPresetsModel.$activePresetId);
  const segmentPresets = useUnit(dashboardPresetsModel.$segmentPresets);
  const overflowPresets = useUnit(dashboardPresetsModel.$overflowPresets);
  const presetActivated = useUnit(dashboardPresetsModel.presetActivated);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const hasPresets = segmentPresets.length > 0 || overflowPresets.length > 0;
  const hasOverflow = overflowPresets.length > 0;

  const filteredOverflow = useMemo(
    () => overflowPresets.filter((p) => includes(p.name, search)),
    [overflowPresets, search],
  );

  const handleActivate = (id: string | null) => {
    presetActivated(id);
  };

  const handleOverflowActivate = (id: string) => {
    presetActivated(id);
    setOverflowOpen(false);
    setSearch('');
  };

  if (!hasPresets) return null;

  return (
    <>
      <div className="flex items-center gap-x-1">
        <div className="flex items-center rounded-md border border-filter-border bg-input-background">
          {/* All button — always first */}
          <button
            type="button"
            className={[
              'border-r border-filter-border px-3 py-1.5 text-footnote transition-colors last:border-r-0',
              activePresetId === null
                ? 'bg-icon-accent text-white'
                : 'text-text-secondary hover:bg-action-background-hover',
            ].join(' ')}
            onClick={() => handleActivate(null)}
          >
            <FootnoteText as="span" className="text-inherit">
              {t('dashboard.presets.all')}
            </FootnoteText>
          </button>

          {/* Up to 3 MRU segment presets */}
          {segmentPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={[
                'border-r border-filter-border px-3 py-1.5 text-footnote transition-colors last:border-r-0',
                activePresetId === preset.id
                  ? 'bg-icon-accent text-white'
                  : 'text-text-secondary hover:bg-action-background-hover',
              ].join(' ')}
              onClick={() => handleActivate(preset.id)}
            >
              <FootnoteText as="span" className="text-inherit">
                {preset.name}
              </FootnoteText>
            </button>
          ))}

          {/* Overflow button — shows when there are more than 3 presets */}
          {hasOverflow && (
            <Popover open={overflowOpen} align="end" side="bottom" onToggle={setOverflowOpen}>
              <Popover.Trigger>
                <button
                  type="button"
                  className="border-r border-filter-border px-3 py-1.5 text-footnote text-text-secondary transition-colors last:border-r-0 hover:bg-action-background-hover"
                >
                  <FootnoteText as="span" className="text-inherit">
                    {'▾ ' + String(overflowPresets.length)}
                  </FootnoteText>
                </button>
              </Popover.Trigger>
              <Popover.Content>
                <div className="w-[220px] p-1">
                  <div className="px-2 pt-2 pb-1">
                    <SearchInput
                      value={search}
                      placeholder={t('dashboard.presets.searchPresets')}
                      onChange={setSearch}
                    />
                  </div>
                  <div className="mt-1 max-h-48 overflow-y-auto">
                    {filteredOverflow.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={[
                          'flex w-full items-center rounded px-2 py-1.5 text-left transition-colors hover:bg-action-background-hover',
                          activePresetId === preset.id
                            ? 'border-l-2 border-icon-accent bg-block-background-default'
                            : '',
                        ].join(' ')}
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
                      onClick={() => {
                        setModalOpen(true);
                        setOverflowOpen(false);
                      }}
                    >
                      <Icon name="settingsLite" size={14} className="text-icon-default" />
                      <FootnoteText className="text-text-secondary">{t('dashboard.presets.manage')}</FootnoteText>
                    </button>
                  </div>
                </div>
              </Popover.Content>
            </Popover>
          )}
        </div>

        {/* Gear icon — shown when there are presets but no overflow */}
        {!hasOverflow && <IconButton name="settingsLite" onClick={() => setModalOpen(true)} />}
      </div>
      <PresetManagementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
