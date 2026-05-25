import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { includesMultiple, toShortAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { SearchInput } from '@/shared/ui-kit';
import { type AccountEntry } from '@/aggregates/account-presets';

import { AccountEntryRowBadges } from './AccountEntryRowBadges';
import { VirtualAccountList } from './VirtualAccountList';

type Props = {
  matched: AccountEntry[];
  totalEntries: number;
};

export const MatchedAccountsPreview = ({ matched, totalEntries }: Props) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const matchesAll = matched.length === totalEntries && totalEntries > 0;

  const filtered = useMemo(
    () => matched.filter((entry) => includesMultiple([entry.address, ...entry.aliases], search)),
    [matched, search],
  );

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

      {filtered.length === 0 && !matchesAll && (
        <div className="rounded-sm bg-block-background-default px-3 py-2">
          <FootnoteText className="text-text-tertiary">{t('dashboard.presets.modal.noMatches')}</FootnoteText>
        </div>
      )}

      {filtered.length > 0 && (
        <VirtualAccountList
          entries={filtered}
          className="max-h-[280px]"
          renderRow={(entry) => (
            <div className="flex items-center gap-x-2 rounded px-2 py-1.5">
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
      )}
    </div>
  );
};
