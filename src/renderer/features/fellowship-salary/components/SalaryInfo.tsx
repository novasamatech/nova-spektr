import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, getRelativeTimeFromApi, nonNullable } from '@/shared/lib/utils';
import { Button, DetailRow, Duration, FootnoteText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { fellowshipSalaryFeature } from '../model/feature';
import { member } from '../model/member';
import { memberSalary } from '../model/memberSalary';

export const SalaryInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(member.$member);
  const identity = useUnit(member.$identity);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const claimStatus = useUnit(memberSalary.$memberClaimStatus);
  const salary = useUnit(memberSalary.$memberSalary);

  useEffect(() => {
    if (input?.api && currentPeriod && currentPeriod.type !== 'unknown') {
      getRelativeTimeFromApi(currentPeriod.left, input.api).then(setTimeLeft);
    }
  }, [input?.api, currentPeriod]);

  const canInteractWithSalary = nonNullable(claimStatus) && claimStatus.type !== 'none';
  const isCurrentCycle = nonNullable(claimStatus) && claimStatus?.lastActive === currentPeriod?.cycleIndex;
  const isSalaryRequested = isCurrentCycle && claimStatus && claimStatus.type === 'registered';
  const isPayoutRequested = isCurrentCycle && claimStatus && claimStatus.type === 'payout';

  return (
    <Box padding={[4, 5, 5]} gap={6}>
      <Box gap={2}>
        <HelpText className="text-text-secondary">{t('fellowship.salary.salaryInfo.beneficiary')}</HelpText>

        <Box width="60%">
          {nonNullable(currentMember) && nonNullable(input?.chain) && (
            <Account iconSize={28} title={identity?.name} accountId={currentMember.accountId} chain={input.chain} />
          )}
        </Box>
      </Box>
      {canInteractWithSalary && (
        <Box>
          {currentPeriod?.type === 'registration' && (
            <div className="flex flex-col items-start gap-4 rounded-lg border p-4">
              {nonNullable(salary) && (
                <DetailRow
                  label={t('fellowship.salary.salaryInfo.requestSalaryCall', {
                    salary: formatBalance(salary.active, 6, { K: true }).formatted,
                  })}
                >
                  <SmallTitleText>
                    <Duration seconds={timeLeft / 1000} />
                  </SmallTitleText>
                </DetailRow>
              )}
              {isSalaryRequested ? (
                <FootnoteText className="flex items-center gap-1 text-tab-text-accent">
                  <Icon name="voted" size={16} className="text-inherit" />
                  <span>{t('fellowship.salary.salaryInfo.requestSalarySuccess')}</span>
                </FootnoteText>
              ) : (
                <Button variant="fill" disabled>
                  {t('fellowship.salary.salaryInfo.requestSalary')}
                </Button>
              )}
            </div>
          )}
          {currentPeriod?.type === 'payout' && (
            <div className="flex flex-col items-start gap-4 rounded-lg border p-4">
              <DetailRow
                label={t('fellowship.salary.salaryInfo.payoutSalaryCall', {
                  salary: formatBalance(salary.active, 6, { K: true }).formatted,
                })}
              >
                <SmallTitleText>
                  <Duration seconds={timeLeft / 1000} />
                </SmallTitleText>
              </DetailRow>
              {isPayoutRequested ? (
                <FootnoteText className="flex items-center gap-1 text-tab-text-accent">
                  <Icon name="voted" size={16} className="text-inherit" />
                  <span>{t('fellowship.salary.salaryInfo.payoutSalarySuccess')}</span>
                </FootnoteText>
              ) : (
                <Button variant="fill" disabled>
                  {t('fellowship.salary.salaryInfo.payoutSalary')}
                </Button>
              )}
            </div>
          )}
        </Box>
      )}
    </Box>
  );
});
