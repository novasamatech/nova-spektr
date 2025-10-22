import { useStoreMap, useUnit } from 'effector-react';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { $features } from '@/shared/config/features';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { SearchInput } from '@/shared/ui-kit';
import { fellowshipOverviewFeature } from '../../model/feature';
import { membersModel } from '../../model/members';

import { MembersEmptyState } from './MembersEmptyState';
import { MembersFilters } from './MembersFilters';
import { MembersTable } from './MembersTable';

export type MembersTabProps = Record<string, never>;

export const MembersTab = memo(({ searchQuery = '', onClearSearch }: MembersTabProps) => {
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const deferredQuery = useDeferredValue(searchQuery);

  const chain = useStoreMap({
    store: fellowshipOverviewFeature.input,
    keys: [],
    fn: input => input?.chain ?? null,
  });

  const membersWithSalary = useUnit(membersModel.$membersWithSalary);
  const { list } = useDeferredList({ list: membersWithSalary });

  const filteredMembers = useMemo(() => {
    let filtered = performSearch({
      query: deferredQuery,
      records: list,
      getMeta: member => ({
        address: toAddress(member.accountId, { prefix: chain?.addressPrefix }),
        name: member.name ?? '',
      }),
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

    return filtered.map(member => ({
      ...member,
      address: toAddress(member.accountId, { prefix: chain?.addressPrefix }),
    }));
  }, [list, chain, deferredQuery, rankFilter, statusFilter]);

  const handleClearFilters = useCallback(() => {
    setRankFilter('all');
    setStatusFilter('all');
  }, []);

  const handleClearSearch = useCallback(() => {
    onClearSearch?.();
    handleClearFilters();
  }, [onClearSearch, handleClearFilters]);

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
        <MembersTable data={filteredMembers} />
      )}
    </div>
  );
});
