import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Button, HeadlineText, TitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { memberSalary } from '../../model/memberSalary';

export const requestSalaryInductActionSlot = createSlot();

type Props = {
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const RequestSalaryInduct = ({ canSkip, onSkip }: Props) => {
  const { t } = useI18n();

  const salary = useUnit(memberSalary.$memberSalary);

  return (
    <Box fillContainer padding={5} gap={5}>
      <TitleText>{t('fellowship.tasks.task.requestSalaryInduct.title')}</TitleText>
      <HeadlineText>
        {t('fellowship.tasks.task.requestSalaryInduct.description', {
          salary: salaryService.formatSalaryAmount(salary.active),
        })}
      </HeadlineText>
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={requestSalaryInductActionSlot} />
        {canSkip && (
          <Button variant="text" onClick={onSkip}>
            {t('fellowship.tasks.skip')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
