import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../../model/feature';
import { memberSalary } from '../../model/memberSalary';
import { BadgeIcon } from '../TaskBadge';

export const payoutSalaryTaskActionSlot = createSlot();

export const RequestPayout = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const input = useUnit(fellowshipTasksFeature.input);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const salary = useUnit(memberSalary.$memberSalary);

  useEffect(() => {
    if (input?.api && currentPeriod && currentPeriod.type !== 'unknown') {
      getCreatedDateFromApi(currentPeriod.until, input.api).then(setPeriodEnd);
    }
  }, [input?.api, currentPeriod]);

  return (
    <Box direction="row" fillContainer padding={5} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="withdrawSalary" />
      </Box>
      <Box gap={3} grow={1} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.requestPayout.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.requestPayout.description', {
            salary: salaryService.formatSalaryAmount(salary.active),
            endDate: formatDate(periodEnd, 'dd/MM/yy'),
          })}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.requestPayout.until', {
            salary: salaryService.formatSalaryAmount(salary.active),
            date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yy') : null,
          })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" horizontalAlign="flex-end" shrink={0} gap={8.5} height="100%">
        <Box width="102px">
          <Slot id={payoutSalaryTaskActionSlot} />
        </Box>
      </Box>
    </Box>
  );
};
