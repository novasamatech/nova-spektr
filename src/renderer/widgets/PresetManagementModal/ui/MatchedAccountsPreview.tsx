import { type ReactNode, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, includes, toAddress, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { SearchInput } from '@/shared/ui-kit';
import { type PresetFilterCriteria } from '@/aggregates/dashboard-presets';
import { type DashboardEntry, applyPresetFilter } from '@/pages/Dashboard/model/dashboard-model';

type Props = {
  allEntries: DashboardEntry[];
  filters: PresetFilterCriteria;
};

const MAX_VISIBLE = 50;

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

export const MatchedAccountsPreview = ({ allEntries, filters }: Props) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const matched = useMemo(() => applyPresetFilter(filters, allEntries), [filters, allEntries]);
  const matchesAll = matched.length === allEntries.length && allEntries.length > 0;

  const filtered = useMemo(
    () => matched.filter((entry) => includes(entry.name, search) || includes(entry.address, search)),
    [matched, search],
  );

  const visible = filtered.slice(0, MAX_VISIBLE);
  const remaining = filtered.length - visible.length;

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-footnote text-text-tertiary">
        {t('dashboard.presets.modal.matchingAccounts', { count: matched.length })}
      </span>

      <SearchInput value={search} placeholder={t('dashboard.presets.modal.searchAccounts')} onChange={setSearch} />

      {matchesAll && (
        <div className="rounded-sm bg-block-background-default px-3 py-2">
          <FootnoteText className="text-text-secondary">{t('dashboard.presets.modal.matchesAll')}</FootnoteText>
        </div>
      )}

      {visible.length === 0 && !matchesAll && (
        <div className="rounded-sm bg-block-background-default px-3 py-2">
          <FootnoteText className="text-text-tertiary">{t('dashboard.presets.modal.noMatches')}</FootnoteText>
        </div>
      )}

      {visible.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-sm">
          {visible.map((entry) => (
            <div key={entry.id} className="flex items-center gap-x-2 rounded px-2 py-1.5">
              <div className="pointer-events-none shrink-0">
                <Identicon address={toAddress(entry.address)} size={24} canCopy={false} />
              </div>
              <div className="min-w-0 flex-1">
                <FootnoteText className="truncate text-text-primary">{entry.name}</FootnoteText>
                <CaptionText className="text-text-tertiary">{toShortAddress(entry.address, 6)}</CaptionText>
              </div>
              <div className="flex shrink-0 items-center gap-x-1">
                {entry.entityNames && entry.entityNames.length > 0 && (
                  <Badge className={ENTITY_BADGE}>{entry.entityNames[0]}</Badge>
                )}
                <Badge className={SOURCE_BADGE_COLORS[entry.source]}>
                  {SOURCE_LABELS[entry.source] ?? entry.source}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <FootnoteText className="text-center text-text-tertiary">
          {t('dashboard.presets.modal.moreAccounts', { count: remaining })}
        </FootnoteText>
      )}
    </div>
  );
};

const Badge = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cnTw('rounded-full px-2 py-0.5 text-[10px] font-medium', className)}>{children}</span>
);
