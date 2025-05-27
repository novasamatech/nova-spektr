import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { memberSalary } from '../../model/memberSalary';
import { BadgeIcon } from '../TaskBadge';

export const requestSalaryInductTaskActionSlot = createSlot();

export const RequestSalaryInduct = () => {
  const { t } = useI18n();

  const salary = useUnit(memberSalary.$memberSalary);

  return (
    <Box direction="row" fillContainer padding={4} gap={2} verticalAlign="flex-end">
      <Box alignSelf="flex-start" shrink={0}>
        <BadgeIcon iconName="requestSalary" />
      </Box>
      <Box gap={3} width="100%" alignSelf="flex-start">
        <SmallTitleText>{t('fellowship.tasks.task.requestSalaryInduct.title')}</SmallTitleText>
        <FootnoteText>
          {t('fellowship.tasks.task.requestSalaryInduct.description', {
            salary: salaryService.formatSalaryAmount(salary.active),
          })}
        </FootnoteText>
      </Box>
      <Box height="100%" width="102px" shrink={0}>
        <Slot id={requestSalaryInductTaskActionSlot} />
      </Box>
    </Box>
  );
};
