import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../../model/feature';
import { memberSalary } from '../../model/memberSalary';

export const requestSalaryActionSlot = createSlot();

export const RequestSalary = memo(() => {
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
    <Box direction="row" padding={4} gap={5} verticalAlign="flex-end">
      <Box gap={3} grow={1}>
        <SmallTitleText>{t('fellowship.tasks.task.requestSalary.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.requestSalary.description', {
            salary: salaryService.formatSalaryAmount(salary.active),
          })}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t('fellowship.tasks.task.requestSalary.until', {
            date: formatDate(periodEnd, 'dd.MM.yyyy'),
          })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" shrink={0}>
        <Slot id={requestSalaryActionSlot} />
      </Box>
    </Box>
  );
});
