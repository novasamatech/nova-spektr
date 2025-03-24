import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi, getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../../model/feature';
import { memberSalary } from '../../model/memberSalary';

const threeDays = 3 * 24 * 3600 * 1000;

export const payoutSalaryActionSlot = createSlot();

export const RequestPayout = () => {
  const { t, formatDate } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);
  const [periodEnd, setPeriodEnd] = useState(0);

  const input = useUnit(fellowshipTasksFeature.input);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const salary = useUnit(memberSalary.$memberSalary);

  useEffect(() => {
    if (input?.api && currentPeriod && currentPeriod.type !== 'unknown') {
      getRelativeTimeFromApi(currentPeriod.left, input.api).then(setTimeLeft);
      getCreatedDateFromApi(currentPeriod.until, input.api).then(setPeriodEnd);
    }
  }, [input?.api, currentPeriod]);

  return (
    <Box direction="row" fillContainer padding={5} gap={5} verticalAlign="flex-end">
      <Box gap={3} grow={1}>
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
            date: formatDate(periodEnd, 'dd.MM.yy'),
          })}
        </FootnoteText>
      </Box>
      <Box verticalAlign="center" horizontalAlign="flex-end" shrink={0} gap={8.5} height="100%">
        <Box direction="row" gap={1} verticalAlign="center">
          <Icon name="clock" size={16} className={timeLeft <= threeDays ? 'text-icon-negative' : 'text-icon-warning'} />
          <FootnoteText className="text-text-secondary">
            <Duration seconds={timeLeft / 1000} />
          </FootnoteText>
        </Box>
        <Slot id={payoutSalaryActionSlot} />
      </Box>
    </Box>
  );
};
