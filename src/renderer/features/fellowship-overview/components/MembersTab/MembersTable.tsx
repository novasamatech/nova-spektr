import { memo, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { type Column, Indicator, ScrollArea, Table } from '@/shared/ui-kit';
import { type CoreMember, salaryService, useSalaries } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentities } from '@/aggregates/fellowship-network';
import { NamedAccount } from '@/widgets/NameResolver';

export type MemberRow = CoreMember & {
  name?: string;
  nameOrAccountId: string;
  salary: string;
  salaryAmount: number;
};

type MembersTableProps = {
  members: CoreMember[];
};

export const MembersTable = memo(({ members }: MembersTableProps) => {
  const { t } = useI18n();

  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: currentMember } = useFellowshipMember();
  const { data: salaries } = useSalaries({ palletType: 'fellowship', api });
  const { data: identities } = useFellowshipIdentities(members.map(m => m.accountId));

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
        key: 'nameOrAccountId',
        title: t('fellowship.overview.members.table.account'),
        sortable: true,
        width: '452px',
        render: (_, member) => {
          const isCurrentUser = currentMember?.accountId === member.accountId;
          return (
            <div className="flex items-center gap-[8px]">
              {chain && (
                <NamedAccount
                  accountId={member.accountId}
                  title={member.name}
                  chain={chain}
                  iconSize={20}
                  hideAddress
                />
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

  const data = useMemo(() => {
    return members
      .map<MemberRow>(member => {
        let salaryText = '-';
        let salaryAmount = 0;

        if (salaries) {
          const memberSalary = salaryService.getMemberSalary(member, salaries);
          const rawSalary = member.isActive ? memberSalary.active : memberSalary.passive;
          salaryText = salaryService.formatSalaryAmount(rawSalary);
          salaryAmount = rawSalary.toNumber();
        }

        const name = identities[member.accountId]
          ? identityService.getFullName(identities[member.accountId]!)
          : undefined;

        return {
          ...member,
          name,
          nameOrAccountId: name ?? member.accountId,
          salary: salaryText,
          salaryAmount,
        };
      })
      .sort((a, b) => {
        // Sort to put current user at the top
        const aIsCurrentUser = currentMember?.accountId === a.accountId;
        const bIsCurrentUser = currentMember?.accountId === b.accountId;

        if (aIsCurrentUser && !bIsCurrentUser) return -1;
        if (!aIsCurrentUser && bIsCurrentUser) return 1;
        return 0;
      });
  }, [members, currentMember, salaries, identities]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ScrollArea>
        <div className="px-5 pb-5">
          <Table
            columns={columns}
            data={data}
            className="w-full rounded-lg"
            rowTestId={TEST_IDS.FELLOWSHIP.MEMBER_ROW}
          />
        </div>
      </ScrollArea>
    </div>
  );
});
