import { BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { useFellowshipMemberSalary } from '@/aggregates/fellowship-member';
import { useCurrentSalaryPeriod, useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { BadgeIcon } from '../TaskBadge';

export const payoutSalaryTaskActionSlot = createSlot();

export const RequestPayout = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: currentPeriod } = useCurrentSalaryPeriod();
  const { data: salary, pending: pendingSalary } = useFellowshipMemberSalary();

  useEffect(() => {
    if (api && chain && currentPeriod && currentPeriod.type !== 'unknown') {
      getCreatedDateFromApi(currentPeriod.until, api, chain).then(setPeriodEnd);
    }
  }, [api, currentPeriod]);

  return (
    <Box direction="row" fillContainer padding={5} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="withdrawSalary" />
      </Box>
      <Box gap={3} grow={1} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.requestPayout.title')}</SmallTitleText>
        <Skeleton active={pendingSalary}>
          <FootnoteText>
            {t('fellowship.tasks.task.requestPayout.description', {
              salary: salaryService.formatSalaryAmount(salary?.active ?? BN_ZERO),
              endDate: formatDate(periodEnd, 'dd/MM/yy'),
            })}
          </FootnoteText>
          <FootnoteText className="text-text-secondary">
            {t('fellowship.tasks.task.requestPayout.until', {
              salary: salaryService.formatSalaryAmount(salary?.active ?? BN_ZERO),
              date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yy') : null,
            })}
          </FootnoteText>
        </Skeleton>
      </Box>
      <Box verticalAlign="center" horizontalAlign="flex-end" shrink={0} gap={8.5} height="100%">
        <Box width="102px">
          <Slot id={payoutSalaryTaskActionSlot} />
        </Box>
      </Box>
    </Box>
  );
};
