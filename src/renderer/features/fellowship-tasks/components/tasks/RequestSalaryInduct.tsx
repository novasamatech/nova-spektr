import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Separator, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { memberSalary } from '../../model/memberSalary';

export const requestSalaryInductActionSlot = createSlot();

export const RequestSalaryInduct = () => {
  const { t } = useI18n();

  const salary = useUnit(memberSalary.$memberSalary);

  return (
    <Box direction="row" fillContainer padding={5} gap={5}>
      <Box gap={3}>
        <SmallTitleText>{t('fellowship.tasks.task.requestSalaryInduct.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.requestSalaryInduct.description', {
            salary: salaryService.formatSalaryAmount(salary.active),
          })}
        </FootnoteText>
      </Box>
      <Separator vertical />
      <Box verticalAlign="center" horizontalAlign="space-between" shrink={0}>
        <Slot id={requestSalaryInductActionSlot} />
      </Box>
    </Box>
  );
};
