import { useUnit } from 'effector-react';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { SearchInput } from '@/shared/ui-kit';
import { useCoreMembers } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentities } from '@/aggregates/fellowship-network';

import { MembersEmptyState } from './MembersEmptyState';
import { MembersFilters } from './MembersFilters';
import { MembersTable } from './MembersTable';

export type MembersTabProps = Record<string, never>;

export const MembersTab = memo((_props: MembersTabProps) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const deferredQuery = useDeferredValue(searchQuery);

  const chain = useFellowshipChain();
  const api = useFellowshipApi();

  const { data: members } = useCoreMembers({ palletType: 'fellowship', api });
  const { data: identities } = useFellowshipIdentities(members.map(m => m.accountId));

  const features = useUnit($features);

  const { list } = useDeferredList({ list: members });

  const filteredMembers = useMemo(() => {
    let filtered = performSearch({
      query: deferredQuery,
      records: list,
      getMeta: member => {
        const identity = identities[member.accountId];
        return {
          address: toAddress(member.accountId, { prefix: chain?.addressPrefix }),
          name: identity ? identityService.getFullName(identity) : '',
        };
      },
      weights: {
        name: 1,
        address: 0.5,
      },
    });

    if (rankFilter !== 'all') {
      const rank = parseInt(rankFilter);
      filtered = filtered.filter(member => member.rank === rank);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => {
        if (statusFilter === 'active') return member.isActive;
        if (statusFilter === 'passive') return !member.isActive;
        return true;
      });
    }

    return filtered;
  }, [list, chain, deferredQuery, rankFilter, statusFilter]);

  const handleClearFilters = useCallback(() => {
    setRankFilter('all');
    setStatusFilter('all');
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    handleClearFilters();
  }, [handleClearFilters]);

  const isEmpty = filteredMembers.length === 0 && (deferredQuery || rankFilter !== 'all' || statusFilter !== 'all');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex-1" />
        <div className={features.codex ? 'w-[645px]' : 'w-[725px]'}>
          <SearchInput
            placeholder={t('fellowship.overview.searchPlaceholder')}
            value={searchQuery}
            height="sm"
            width="full"
            testId={TEST_IDS.FELLOWSHIP.MEMBERS_SEARCH}
            onChange={setSearchQuery}
          />
        </div>
      </div>
      <MembersFilters
        rankFilter={rankFilter}
        statusFilter={statusFilter}
        onRankFilterChange={setRankFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={handleClearFilters}
      />
      {isEmpty ? (
        <MembersEmptyState
          searchQuery={deferredQuery}
          hasActiveFilters={rankFilter !== 'all' || statusFilter !== 'all'}
          onClearSearch={handleClearSearch}
        />
      ) : (
        <MembersTable members={filteredMembers} />
      )}
    </div>
  );
});
