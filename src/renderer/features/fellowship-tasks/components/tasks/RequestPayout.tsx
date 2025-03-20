import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi, getRelativeTimeFromApi } from '@/shared/lib/utils';
import { Button, Duration, HeadlineText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../../model/feature';
import { memberSalary } from '../../model/memberSalary';

export const payoutSalaryActionSlot = createSlot();

type Props = {
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const RequestPayout = ({ canSkip, onSkip }: Props) => {
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
    <Box fillContainer padding={4} gap={5}>
      <SmallTitleText>{t('fellowship.tasks.task.requestPayout.title')}</SmallTitleText>
      <Box direction="row" verticalAlign="center" gap={1.5}>
        <Icon className="text-icon-warning" name="warn" size={14} />
        <SmallTitleText>
          <Trans
            t={t}
            i18nKey="fellowship.tasks.task.requestSalary.left"
            components={{ duration: <Duration seconds={timeLeft / 1000} /> }}
          />
        </SmallTitleText>
      </Box>
      <HeadlineText>
        {t('fellowship.tasks.task.requestPayout.description', {
          salary: salaryService.formatSalaryAmount(salary.active),
          endDate: formatDate(periodEnd, 'dd/MM/yy'),
        })}
      </HeadlineText>
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={payoutSalaryActionSlot} />
        {canSkip && (
          <Button variant="text" onClick={onSkip}>
            {t('fellowship.tasks.skip')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
