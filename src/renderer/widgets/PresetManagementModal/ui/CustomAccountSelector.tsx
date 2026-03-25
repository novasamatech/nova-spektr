import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includes, toAddress, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Checkbox, Input, SearchInput } from '@/shared/ui-kit';
import { type DashboardEntry } from '@/pages/Dashboard/model/dashboard-model';

type Props = {
  name: string;
  allEntries: DashboardEntry[];
  selectedIds: string[];
  onNameChange: (name: string) => void;
  onSelectedIdsChange: (ids: string[]) => void;
};

export const CustomAccountSelector = ({ name, allEntries, selectedIds, onNameChange, onSelectedIdsChange }: Props) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(
    () => allEntries.filter((entry) => includes(entry.name, search) || includes(entry.address, search)),
    [allEntries, search],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedSet.has(e.id));
  const someFilteredSelected = filtered.some((e) => selectedSet.has(e.id));

  const toggleEntry = (entryId: string) => {
    if (selectedSet.has(entryId)) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== entryId));
    } else {
      onSelectedIdsChange([...selectedIds, entryId]);
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = new Set(filtered.map((e) => e.id));
      const merged = new Set([...selectedIds, ...filteredIds]);
      onSelectedIdsChange(Array.from(merged));
    } else {
      const filteredIds = new Set(filtered.map((e) => e.id));
      onSelectedIdsChange(selectedIds.filter((id) => !filteredIds.has(id)));
    }
  };

  return (
    <div className="flex flex-col gap-y-3">
      {/* Name */}
      <div className="flex flex-col gap-y-1">
        <label className="text-footnote text-text-tertiary">{t('dashboard.presets.modal.name')}</label>
        <Input
          value={name}
          placeholder={t('dashboard.presets.modal.namePlaceholder')}
          maxLength={30}
          width="full"
          onChange={onNameChange}
        />
      </div>

      {/* Selection header */}
      <FootnoteText className="text-text-tertiary">
        {t('dashboard.presets.modal.selectedCount', { count: selectedIds.length })}
      </FootnoteText>

      {/* Search */}
      <SearchInput value={search} placeholder={t('dashboard.presets.modal.searchAccounts')} onChange={setSearch} />

      {/* Select all visible checkbox */}
      <div className="rounded-sm px-2 py-1">
        <Checkbox checked={allFilteredSelected} semiChecked={someFilteredSelected} onChange={toggleAll}>
          <FootnoteText className="text-text-secondary">
            {t('dashboard.presets.modal.selectAll')} ({filtered.length})
          </FootnoteText>
        </Checkbox>
      </div>

      {/* Account list */}
      <div className="max-h-[280px] overflow-y-auto rounded-sm">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className={cnTw(
              'flex cursor-pointer items-center gap-x-2 rounded px-2 py-1.5 transition-colors hover:bg-action-background-hover',
              selectedSet.has(entry.id) && 'bg-block-background-default',
            )}
            onClick={() => toggleEntry(entry.id)}
          >
            <Checkbox checked={selectedSet.has(entry.id)} onChange={() => toggleEntry(entry.id)} />
            <div className="pointer-events-none shrink-0">
              <Identicon address={toAddress(entry.address)} size={24} canCopy={false} />
            </div>
            <div className="min-w-0 flex-1">
              <FootnoteText className="truncate text-text-primary">{entry.name}</FootnoteText>
              <CaptionText className="text-text-tertiary">{toShortAddress(entry.address, 6)}</CaptionText>
            </div>
            <CaptionText className="shrink-0 text-text-tertiary">{entry.source}</CaptionText>
          </div>
        ))}
      </div>
    </div>
  );
};
