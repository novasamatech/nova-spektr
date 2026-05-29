import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includesMultiple, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Checkbox, SearchInput } from '@/shared/ui-kit';
import { type AccountEntry } from '@/aggregates/account-presets';

import { AccountEntryRowBadges } from './AccountEntryRowBadges';
import { VirtualAccountList } from './VirtualAccountList';

type Props = {
  allEntries: AccountEntry[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

export const CustomAccountSelector = ({ allEntries, selectedIds, onSelectedIdsChange }: Props) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(
    () => allEntries.filter((entry) => includesMultiple([entry.address, ...entry.aliases], search)),
    [allEntries, search],
  );

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((e) => selectedSet.has(e.id)),
    [filtered, selectedSet],
  );
  const someFilteredSelected = useMemo(() => filtered.some((e) => selectedSet.has(e.id)), [filtered, selectedSet]);

  const toggleEntry = (entryId: string) => {
    if (selectedSet.has(entryId)) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== entryId));
    } else {
      onSelectedIdsChange([...selectedIds, entryId]);
    }
  };

  const toggleAll = (checked: boolean) => {
    const filteredIds = new Set(filtered.map((e) => e.id));

    if (checked) {
      const merged = new Set([...selectedIds, ...filteredIds]);
      onSelectedIdsChange(Array.from(merged));
    } else {
      onSelectedIdsChange(selectedIds.filter((id) => !filteredIds.has(id)));
    }
  };

  return (
    <div className="flex flex-col gap-y-3">
      <SearchInput value={search} placeholder={t('dashboard.presets.modal.searchAccounts')} onChange={setSearch} />

      <div className="rounded-sm px-2 py-1">
        <Checkbox checked={allFilteredSelected} semiChecked={someFilteredSelected} onChange={toggleAll}>
          <FootnoteText className="text-text-secondary">
            {t('dashboard.presets.modal.selectAll')} ({filtered.length})
          </FootnoteText>
        </Checkbox>
      </div>

      <VirtualAccountList
        entries={filtered}
        className="max-h-[280px]"
        renderRow={(entry) => (
          <div
            className={cnTw(
              'flex cursor-pointer items-center gap-x-2 rounded px-2 py-1.5 transition-colors hover:bg-action-background-hover',
              selectedSet.has(entry.id) && 'bg-block-background-default',
            )}
            onClick={() => toggleEntry(entry.id)}
          >
            <Checkbox checked={selectedSet.has(entry.id)} onChange={() => toggleEntry(entry.id)} />
            <div className="shrink-0">
              <Identicon address={entry.address} size={24} canCopy />
            </div>
            <div className="min-w-0 flex-1">
              <FootnoteText className="truncate text-text-primary">{entry.name}</FootnoteText>
              <CaptionText className="text-text-tertiary">{toShortAddress(entry.address, 6)}</CaptionText>
            </div>
            <AccountEntryRowBadges entry={entry} />
          </div>
        )}
      />
    </div>
  );
};
