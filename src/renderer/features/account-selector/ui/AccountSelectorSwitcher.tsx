import { type Store } from 'effector';
import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includes } from '@/shared/lib/utils';
import { Counter, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { Popover, SearchInput, Tabs, Tooltip } from '@/shared/ui-kit';
import { type AccountEntry, type PresetFilterCriteria, accountPresetsModel } from '@/aggregates/account-presets';
import { PresetManagementModal, SourceBreakdownBar } from '@/widgets/PresetManagementModal';

import { QuickFilterPopover } from './QuickFilterPopover';

type TabCounterProps = {
  label: string;
  entries: AccountEntry[];
  total: number;
};

const TabCounter = ({ label, entries, total }: TabCounterProps) => {
  return (
    <Tooltip side="bottom">
      <Tooltip.Trigger>
        <span className="inline-flex items-center gap-x-1.5">
          {label}
          <Counter variant="neutral">{entries.length}</Counter>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content className="w-[260px] max-w-[260px] px-3 py-2.5">
        <SourceBreakdownBar entries={entries} total={total} tone="dark" />
      </Tooltip.Content>
    </Tooltip>
  );
};

const ALL_VALUE = '__all__';

type Props = {
  $activePresetId: Store<string | null>;
  onActivate: (id: string | null) => void;
  $quickFilters: Store<PresetFilterCriteria>;
  onQuickFiltersChange: (filters: PresetFilterCriteria) => void;
};

/**
 * WARNING — this component is injected into DI slots via `feature.inject(..., {
 * render: ... })`. The DI slot renderer invokes `render(props)` as a function,
 * not as JSX, so wrapping this (or any of its slot-injected wrappers such as
 * `DashboardAccountSelector` / `OperationsAccountSelector`) in `memo()` will
 * break the slot call path (`TypeError: render is not a function`). Memoize
 * child components instead if needed.
 */
export const AccountSelectorSwitcher = ({
  $activePresetId,
  onActivate,
  $quickFilters,
  onQuickFiltersChange,
}: Props) => {
  const { t } = useI18n();
  const activePresetId = useUnit($activePresetId);
  const segmentPresets = useUnit(accountPresetsModel.$segmentPresets);
  const overflowPresets = useUnit(accountPresetsModel.$overflowPresets);
  const allEntries = useUnit(accountPresetsModel.$allEntries);
  const entriesByPresetId = useUnit(accountPresetsModel.$entriesByPresetId);

  const totalCount = allEntries.length;

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const hasOverflow = overflowPresets.length > 0;

  const filteredOverflow = useMemo(
    () => overflowPresets.filter((p) => includes(p.name, search)),
    [overflowPresets, search],
  );

  const handleTabChange = useCallback(
    (value: string) => {
      onActivate(value === ALL_VALUE ? null : value);
    },
    [onActivate],
  );

  const handleOverflowActivate = useCallback(
    (id: string) => {
      onActivate(id);
      setOverflowOpen(false);
      setSearch('');
    },
    [onActivate],
  );

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
              <Tabs.Trigger value={ALL_VALUE}>
                <TabCounter label={t('presets.all')} entries={allEntries} total={totalCount} />
              </Tabs.Trigger>
              {segmentPresets.map((preset) => (
                <Tabs.Trigger key={preset.id} value={preset.id}>
                  <TabCounter label={preset.name} entries={entriesByPresetId[preset.id] ?? []} total={totalCount} />
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
                {'▾ ' + String(overflowPresets.length)}
              </button>
            </Popover.Trigger>
            <Popover.Content>
              <div className="w-[220px] p-1">
                <div className="px-2 pt-2 pb-1">
                  <SearchInput value={search} placeholder={t('presets.searchPresets')} onChange={setSearch} />
                </div>
                <div className="mt-1 max-h-48 overflow-y-auto">
                  {filteredOverflow.map((preset) => {
                    const matched = entriesByPresetId[preset.id] ?? [];

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={cnTw(
                          'flex w-full items-center justify-between gap-x-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-action-background-hover',
                          activePresetId === preset.id && 'border-l-2 border-icon-accent bg-block-background-default',
                        )}
                        onClick={() => handleOverflowActivate(preset.id)}
                      >
                        <FootnoteText className="text-text-primary">{preset.name}</FootnoteText>
                        <Counter variant="neutral">{matched.length}</Counter>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 border-t border-divider pt-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-x-1.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-action-background-hover"
                    onClick={handleOpenModal}
                  >
                    <Icon name="settingsLite" size={14} className="text-icon-default" />
                    <FootnoteText className="text-text-secondary">{t('presets.manage')}</FootnoteText>
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover>
        ) : (
          <IconButton name="settingsLite" onClick={handleOpenSettings} />
        )}

        <QuickFilterPopover $filters={$quickFilters} onChange={onQuickFiltersChange} />
      </div>
      <PresetManagementModal isOpen={modalOpen} onClose={handleCloseModal} />
    </>
  );
};
