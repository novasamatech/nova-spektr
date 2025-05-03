import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, Duration, FootnoteText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { fellowshipSalaryFeature } from '../model/feature';
import { memberSalary } from '../model/memberSalary';
import { profile } from '../model/profile';

import { SalaryInductModal } from './SalaryInductModal';
import { SalaryPayoutModal } from './SalaryPayoutModal';
import { SalaryRegisterModal } from './SalaryRegisterModal';

export const SalaryInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const account = useUnit(profile.$account);
  const identity = useUnit(profile.$identity);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const claimStatus = useUnit(memberSalary.$memberClaimStatus);
  const salary = useUnit(memberSalary.$memberSalary);

  useEffect(() => {
    if (input?.api && currentPeriod && currentPeriod.type !== 'unknown') {
      getRelativeTimeFromApi(currentPeriod.left, input.api).then(setTimeLeft);
    }
  }, [input?.api, currentPeriod]);

  const disabled = nullable(account) || !accountService.hasPermissionToMakeActions(account);
  const canInteractWithSalary = nonNullable(claimStatus) && salaryService.isInducted(claimStatus);
  const canInductSalary = nonNullable(claimStatus) && !salaryService.isInducted(claimStatus);
  const canRequestSalary =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.canRequestSalary(claimStatus, currentPeriod);
  const canRequestSalaryPayout =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.canRequestSalaryPayout(claimStatus, currentPeriod);
  const isSalaryRequested =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.isClaimantRequestedSalary(claimStatus, currentPeriod);
  const isPayoutRequested =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.isClaimantRequestedSalaryPayout(claimStatus, currentPeriod);

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
            <div className="flex items-center gap-4 border-t pt-6">
              <div className="flex grow flex-col gap-1">
                <FootnoteText className="text-text-secondary">
                  {t('fellowship.salary.salaryInfo.requestSalaryCall', {
                    salary: salaryService.formatSalaryAmount(salary.active),
                  })}
                </FootnoteText>

                <SmallTitleText>
                  <Duration seconds={timeLeft / 1000} />
                </SmallTitleText>

                {isSalaryRequested && (
                  <FootnoteText className="flex items-center gap-1 pt-2 text-tab-text-accent">
                    <Icon name="voted" size={16} className="text-inherit" />
                    <span>{t('fellowship.salary.salaryInfo.requestSalarySuccess')}</span>
                  </FootnoteText>
                )}
              </div>

              {canRequestSalary && (
                <SalaryRegisterModal>
                  <Button variant="fill" disabled={disabled}>
                    {t('fellowship.salary.salaryInfo.requestSalary')}
                  </Button>
                </SalaryRegisterModal>
              )}
            </div>
          )}

          {currentPeriod?.type === 'payout' && (
            <div className="flex items-center gap-4 border-t pt-6">
              <div className="flex grow flex-col gap-1">
                <FootnoteText className="text-text-secondary">
                  {t('fellowship.salary.salaryInfo.payoutSalaryCall', {
                    salary: salaryService.formatSalaryAmount(salary.active),
                  })}
                </FootnoteText>

                <SmallTitleText>
                  <Duration seconds={timeLeft / 1000} />
                </SmallTitleText>

                {isPayoutRequested && (
                  <FootnoteText className="flex items-center gap-1 pt-2 text-tab-text-accent">
                    <Icon name="voted" size={16} className="text-inherit" />
                    <span>{t('fellowship.salary.salaryInfo.payoutSalarySuccess')}</span>
                  </FootnoteText>
                )}
              </div>

              {canRequestSalaryPayout && (
                <SalaryPayoutModal beneficiary={null}>
                  <Button variant="fill" disabled={disabled}>
                    {t('fellowship.salary.salaryInfo.payoutSalary')}
                  </Button>
                </SalaryPayoutModal>
              )}
            </div>
          )}
        </Box>
      )}
      {canInductSalary && (
        <div className="flex items-center gap-4 border-t pt-6">
          <div className="flex grow flex-col gap-1">
            <FootnoteText className="text-text-secondary">
              {t('fellowship.salary.salaryInfo.inductSalary')}
            </FootnoteText>

            <SmallTitleText>
              {t('fellowship.salary.salaryInfo.inductSalaryCall', {
                salary: salaryService.formatSalaryAmount(salary.active),
              })}
            </SmallTitleText>
          </div>

          <SalaryInductModal>
            <Button variant="fill" disabled={disabled}>
              {t('fellowship.salary.salaryInfo.inductSalaryAction')}
            </Button>
          </SalaryInductModal>
        </div>
      )}
    </Box>
  );
});
