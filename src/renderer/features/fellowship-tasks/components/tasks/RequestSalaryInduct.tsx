import { BN_ZERO } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { useFellowshipMemberSalary } from '@/aggregates/fellowship-member';
import { useCurrentSalaryPeriod, useFellowshipApi } from '@/aggregates/fellowship-network';
import { BadgeIcon } from '../TaskBadge';

export const requestSalaryInductTaskActionSlot = createSlot();

export const RequestSalaryInduct = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const api = useFellowshipApi();
  const { data: currentPeriod } = useCurrentSalaryPeriod();
  const { data: salary, pending: pendingSalary } = useFellowshipMemberSalary();

  const currentPeriodExists = currentPeriod && currentPeriod.type !== 'unknown';

  useEffect(() => {
    if (api && currentPeriodExists) {
      getCreatedDateFromApi(currentPeriod.until, api).then(setPeriodEnd);
    }
  }, [api, currentPeriod]);

  return (
    <Box direction="row" fillContainer padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="activateSalary" />
      </Box>
      <Box gap={3} width="100%" alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.requestSalaryInduct.title')}</SmallTitleText>
        <Skeleton active={pendingSalary}>
          <FootnoteText>
            {t('fellowship.tasks.task.requestSalaryInduct.description', {
              salary: salaryService.formatSalaryAmount(salary?.active ?? BN_ZERO),
            })}
          </FootnoteText>
        </Skeleton>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.requestSalaryInduct.until', {
            date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yyyy') : null,
          })}
        </FootnoteText>
      </Box>
      <Box height="100%" width="102px" shrink={0}>
        <Slot id={requestSalaryInductTaskActionSlot} />
      </Box>
    </Box>
  );
};
