import { type ReactNode, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includes, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Checkbox, Input, SearchInput } from '@/shared/ui-kit';
import { type AccountEntry } from '@/aggregates/account-presets';

type Props = {
  name: string;
  allEntries: AccountEntry[];
  selectedIds: string[];
  onNameChange: (name: string) => void;
  onSelectedIdsChange: (ids: string[]) => void;
};

const SOURCE_LABELS: Record<string, string> = {
  wallet: 'wallet',
  'local-contact': 'contact',
  'backend-contact': 'external',
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  wallet: 'bg-icon-accent/10 text-icon-accent',
  'local-contact': 'bg-icon-positive/10 text-icon-positive',
  'backend-contact': 'bg-icon-alert/10 text-icon-alert',
};

const ENTITY_BADGE = 'bg-badge-orange-background-default text-badge-orange-text';

export const CustomAccountSelector = ({ name, allEntries, selectedIds, onNameChange, onSelectedIdsChange }: Props) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(
    () => allEntries.filter((entry) => includes(entry.name, search) || includes(entry.address, search)),
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

      <FootnoteText className="text-text-tertiary">
        {t('dashboard.presets.modal.selectedCount', { count: selectedIds.length })}
      </FootnoteText>

      <SearchInput value={search} placeholder={t('dashboard.presets.modal.searchAccounts')} onChange={setSearch} />

      <div className="rounded-sm px-2 py-1">
        <Checkbox checked={allFilteredSelected} semiChecked={someFilteredSelected} onChange={toggleAll}>
          <FootnoteText className="text-text-secondary">
            {t('dashboard.presets.modal.selectAll')} ({filtered.length})
          </FootnoteText>
        </Checkbox>
      </div>

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
            <div className="shrink-0">
              <Identicon address={entry.address} size={24} canCopy />
            </div>
            <div className="min-w-0 flex-1">
              <FootnoteText className="truncate text-text-primary">{entry.name}</FootnoteText>
              <CaptionText className="text-text-tertiary">{toShortAddress(entry.address, 6)}</CaptionText>
            </div>
            <div className="flex shrink-0 items-center gap-x-1">
              {entry.source === 'backend-contact' && entry.entityNames.length > 0 && (
                <Badge className={ENTITY_BADGE}>{entry.entityNames[0]}</Badge>
              )}
              <Badge className={SOURCE_BADGE_COLORS[entry.source]}>{SOURCE_LABELS[entry.source] ?? entry.source}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Badge = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cnTw('rounded-full px-2 py-0.5 text-[10px] font-medium', className)}>{children}</span>
);
