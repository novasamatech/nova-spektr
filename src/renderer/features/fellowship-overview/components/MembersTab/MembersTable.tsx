import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Account, CollectiveRank } from '@/shared/ui-entities';
import { type Column, Indicator, ScrollArea, Table } from '@/shared/ui-kit';
import { type CoreMember } from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipOverviewFeature } from '../../model/feature';

export type MemberRow = CoreMember & {
  name?: string;
  address: string;
  salary?: string;
  salaryAmount: number;
};

type MembersTableProps = {
  data: MemberRow[];
};

export const MembersTable = memo(({ data }: MembersTableProps) => {
  const { t } = useI18n();
  const input = useUnit(fellowshipOverviewFeature.input);
  const currentMember = useUnit(fellowshipMember.$currentMember);

  const chain = input?.chain ?? null;

  const columns: Column<MemberRow>[] = useMemo(
    () => [
      {
        key: 'rank',
        title: t('fellowship.overview.members.table.rank'),
        sortable: true,
        width: '66px',
        render: rank => {
          const rankNumber = typeof rank === 'number' ? rank : 0;
          return (
            <div className="flex items-start">
              <CollectiveRank rank={rankNumber} />
            </div>
          );
        },
      },
      {
        key: 'name',
        title: t('fellowship.overview.members.table.account'),
        sortable: true,
        width: '452px',
        render: (_, member) => {
          const isCurrentUser = currentMember?.accountId === member.accountId;
          return (
            <div className="flex items-center gap-[8px]">
              {chain && (
                <Account accountId={member.accountId} title={member.name} chain={chain} iconSize={20} hideAddress />
              )}
              {isCurrentUser && (
                <BodyText className="font-medium tracking-[-0.12px] text-text-positive">
                  {t('fellowship.overview.members.you')}
                </BodyText>
              )}
            </div>
          );
        },
      },
      {
        key: 'isActive',
        title: t('fellowship.overview.members.table.status'),
        sortable: true,
        width: '94px',
        render: isActive => (
          <div className="flex items-center gap-[2px]">
            <Indicator active={!!isActive} />
            <BodyText className="font-medium tracking-[-0.13px] text-text-primary">
              {isActive
                ? t('fellowship.overview.members.status.active')
                : t('fellowship.overview.members.status.passive')}
            </BodyText>
          </div>
        ),
      },
      {
        key: 'salaryAmount',
        title: t('fellowship.overview.members.table.salary'),
        sortable: true,
        width: '148px',
        render: (_, member) => (
          <div className="flex justify-end">
            <BodyText className="font-medium tracking-[-0.13px] text-text-primary">{member.salary}</BodyText>
          </div>
        ),
      },
    ],
    [t, chain, currentMember],
  );

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ScrollArea>
        <div className="mb-17 px-5">
          <Table columns={columns} data={data} className="w-full" />
        </div>
      </ScrollArea>
    </div>
  );
});
