import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Select } from '@/shared/ui-kit';
import { useCoreMembers } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { getRankDataByRank } from '../../utils/rankHelpers';

type MembersFiltersProps = {
  rankFilter: string;
  statusFilter: string;
  onRankFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
};

export const MembersFilters = memo(
  ({ rankFilter, statusFilter, onRankFilterChange, onStatusFilterChange, onClearFilters }: MembersFiltersProps) => {
    const { t } = useI18n();
    const api = useFellowshipApi();
    const { data: members } = useCoreMembers({ palletType: 'fellowship', api });

    const rankOptions = useMemo(() => {
      const ranks = Array.from(new Set(members.map(m => m.rank))).sort((a, b) => a - b);
      return [
        { value: 'all', label: t('fellowship.overview.members.filters.allRanks') },
        ...ranks.map(rank => {
          if (rank === 0) {
            return {
              value: '0',
              label: `0 - ${t('fellowship.rank.0')}`,
            };
          }
          const rankData = getRankDataByRank(rank);
          return {
            value: rank.toString(),
            label: rankData ? `${rankData.label} - ${rankData.name}` : `Rank ${rank}`,
          };
        }),
      ];
    }, [members, t]);

    const hasActiveFilters = rankFilter !== 'all' || statusFilter !== 'all';

    return (
      <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-[180px]">
            <Select
              value={rankFilter}
              placeholder={t('fellowship.overview.members.filters.selectRank')}
              onChange={onRankFilterChange}
            >
              {rankOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select>
          </div>
          <div className="w-[140px]">
            <Select value={statusFilter} placeholder="Status" onChange={onStatusFilterChange}>
              <Select.Item value="all">{t('fellowship.overview.members.filters.allStatuses')}</Select.Item>
              <Select.Item value="active">{t('fellowship.overview.members.status.active')}</Select.Item>
              <Select.Item value="passive">{t('fellowship.overview.members.status.passive')}</Select.Item>
            </Select>
          </div>
        </div>
        <Button
          variant="text"
          className={cnTw(!hasActiveFilters && 'pointer-events-none opacity-0')}
          onClick={onClearFilters}
        >
          {t('fellowship.overview.members.clearAll')}
        </Button>
      </div>
    );
  },
);
