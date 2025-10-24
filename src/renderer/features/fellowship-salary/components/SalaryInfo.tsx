import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi, nonNullable, nullable, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, Duration, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { salaryService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { $beneficiary } from '../model/beneficiary';
import { fellowshipSalaryFeature } from '../model/feature';
import { memberSalary } from '../model/memberSalary';
import { profile } from '../model/profile';

import { SalaryEditBeneficiaryModal } from './SalaryEditBeneficiaryModal';
import { SalaryInductModal } from './SalaryInductModal';
import { SalaryPayoutModal } from './SalaryPayoutModal';
import { SalaryRegisterModal } from './SalaryRegisterModal';

export const SalaryInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const account = useUnit(profile.$account);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const claimStatus = useUnit(memberSalary.$memberClaimStatus);
  const salary = useUnit(memberSalary.$memberSalary);
  const beneficiary = useUnit($beneficiary);
  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);

  const getBeneficiaryName = (accountId: AccountId): string => {
    const finderFn = <T extends { accountId: AccountId }>(collection: T[]): T | undefined => {
      return collection.find(c => c.accountId === accountId);
    };

    const fromContact = finderFn(contacts)?.name;
    if (fromContact) return fromContact;

    const accounts = wallets.map(wallet => wallet.accounts).flat();
    const fromAccount = finderFn(accounts)?.name;
    if (fromAccount) return fromAccount;

    return toShortAddress(toAddress(accountId, { prefix: input?.chain?.addressPrefix }), 5);
  };

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
    nonNullable(claimStatus) && nonNullable(currentPeriod) && salaryService.isClaimantRequestedSalary(claimStatus);
  const isPayoutRequested =
    nonNullable(claimStatus) &&
    nonNullable(currentPeriod) &&
    salaryService.isClaimantRequestedSalaryPayout(claimStatus);

  return (
    <Box gap={2}>
      <CaptionText className="caption uppercase">{t('fellowship.salary.salary')}</CaptionText>

      <div className="flex gap-2">
        <div className="flex max-w-[50%] grow gap-2 rounded-lg bg-block-background-default p-4">
          {currentMember && currentMember.rank === 0 ? (
            <div className="flex grow flex-col gap-1">
              <FootnoteText className="text-text-secondary">
                {t('fellowship.salary.salaryInfo.insufficientRank')}
              </FootnoteText>
            </div>
          ) : (
            <>
              {canInteractWithSalary && (
                <>
                  {currentPeriod?.type === 'registration' && (
                    <div className="flex grow flex-col gap-1">
                      <FootnoteText className="text-text-secondary">
                        <Duration shortFormat seconds={timeLeft / 1000} />{' '}
                        {isSalaryRequested
                          ? t('fellowship.salary.salaryInfo.timeToNextPayout')
                          : t('fellowship.salary.salaryInfo.timeToRequest')}
                      </FootnoteText>

                      <SmallTitleText>{salaryService.formatSalaryAmount(salary.active)}</SmallTitleText>

                      {isSalaryRequested && (
                        <FootnoteText className="mt-auto flex items-center gap-1 pt-2 pb-1 text-tab-text-accent">
                          <Icon name="voted" size={16} className="text-inherit" />
                          <span>{t('fellowship.salary.salaryInfo.requestSalarySuccess')}</span>
                        </FootnoteText>
                      )}
                      {canRequestSalary && (
                        <SalaryRegisterModal>
                          <Button className="mt-auto w-fit" size="sm" variant="fill" disabled={disabled}>
                            {t('fellowship.salary.salaryInfo.requestSalary')}
                          </Button>
                        </SalaryRegisterModal>
                      )}
                    </div>
                  )}

                  {currentPeriod?.type === 'payout' && (
                    <div className="flex grow flex-col gap-1">
                      <FootnoteText className="text-text-secondary">
                        <Duration shortFormat seconds={timeLeft / 1000} />{' '}
                        {isPayoutRequested
                          ? t('fellowship.salary.salaryInfo.timeToNextCircle')
                          : t('fellowship.salary.salaryInfo.timeToWithdraw')}
                      </FootnoteText>

                      <SmallTitleText>{salaryService.formatSalaryAmount(salary.active)}</SmallTitleText>

                      {isPayoutRequested && (
                        <FootnoteText className="mt-auto flex items-center gap-1 pt-2 pb-1 text-tab-text-accent">
                          <Icon name="voted" size={16} className="text-inherit" />
                          <span>{t('fellowship.salary.salaryInfo.payoutSalarySuccess')}</span>
                        </FootnoteText>
                      )}

                      {canRequestSalaryPayout && (
                        <SalaryPayoutModal>
                          <Button size="sm" variant="fill" className="mt-auto w-fit" disabled={disabled}>
                            {t('fellowship.salary.salaryInfo.payoutSalary')}
                          </Button>
                        </SalaryPayoutModal>
                      )}
                    </div>
                  )}
                </>
              )}
              {canInductSalary && (
                <div className="flex grow flex-col gap-1">
                  <FootnoteText className="text-text-secondary">
                    {t('fellowship.salary.salaryInfo.inductSalary')}
                  </FootnoteText>

                  <SmallTitleText>{salaryService.formatSalaryAmount(salary.active)}</SmallTitleText>

                  <SalaryInductModal>
                    <Button className="mt-auto w-fit" size="sm" variant="fill" disabled={disabled}>
                      {t('fellowship.salary.salaryInfo.inductSalaryAction')}
                    </Button>
                  </SalaryInductModal>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex max-w-[50%] grow flex-col gap-2 rounded-lg bg-block-background-default p-4">
          <FootnoteText className="text-text-secondary">{t('fellowship.salary.salaryInfo.beneficiary')}</FootnoteText>

          {nonNullable(currentMember) && nonNullable(input?.chain) && (
            <SmallTitleText>
              <Address
                showIcon={true}
                variant="truncate"
                iconSize={16}
                title={getBeneficiaryName(beneficiary || currentMember.accountId)}
                address={toAddress(beneficiary || currentMember.accountId, { prefix: input.chain.addressPrefix })}
              />
            </SmallTitleText>
          )}

          <SalaryEditBeneficiaryModal>
            <Button className="mt-2 w-fit" size="sm" variant="fill" pallet="secondary" disabled={disabled}>
              {t('fellowship.salary.salaryInfo.editBeneficiary')}
            </Button>
          </SalaryEditBeneficiaryModal>
        </div>
      </div>
    </Box>
  );
});
