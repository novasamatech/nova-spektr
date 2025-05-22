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

export const requestSalaryTaskActionSlot = createSlot();

export const RequestSalary = () => {
  const { t, formatDate } = useI18n();
  const [periodEnd, setPeriodEnd] = useState(0);

  const input = useUnit(fellowshipTasksFeature.input);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const salary = useUnit(memberSalary.$memberSalary);

  const currentPeriodExists = currentPeriod && currentPeriod.type !== 'unknown';

  useEffect(() => {
    if (input?.api && currentPeriodExists) {
      getCreatedDateFromApi(currentPeriod.until, input.api).then(setPeriodEnd);
    }
  }, [input?.api, currentPeriod]);

  return (
    <Box direction="row" padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="withdrawSalary" />
      </Box>
      <Box gap={3} grow={1} alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.requestSalary.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.requestSalary.description', {
            salary: salaryService.formatSalaryAmount(salary.active),
          })}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.requestSalary.until', {
            date: periodEnd !== 0 ? formatDate(periodEnd, 'dd.MM.yyyy') : null,
          })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" gap={8.5} horizontalAlign="end" shrink={0}>
        <Slot id={requestSalaryTaskActionSlot} />
      </Box>
    </Box>
  );
};
