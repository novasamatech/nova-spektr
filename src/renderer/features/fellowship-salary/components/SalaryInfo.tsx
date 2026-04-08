import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { getRelativeTimeFromApi, nonNullable, nullable, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, Duration, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { memberService, salaryService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import {
  useFellowshipMember,
  useFellowshipMemberSalary,
  useFellowshipMemberSalaryClaimStatus,
} from '@/aggregates/fellowship-member';
import { useCurrentSalaryPeriod } from '@/aggregates/fellowship-network';
import { beneficiary } from '../model/beneficiary';
import { fellowshipSalaryFeature } from '../model/feature';
import { profile } from '../model/profile';

import { SalaryEditBeneficiaryModal } from './SalaryEditBeneficiaryModal';
import { SalaryInductModal } from './SalaryInductModal';
import { SalaryPayoutModal } from './SalaryPayoutModal';
import { SalaryRegisterModal } from './SalaryRegisterModal';

export const SalaryInfo = memo(() => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const account = useUnit(profile.$account);
  const beneficiaryValue = useUnit(beneficiary.$beneficiary);
  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);

  const { data: currentMember } = useFellowshipMember();
  const { data: claimStatus } = useFellowshipMemberSalaryClaimStatus();
  const { data: currentPeriod } = useCurrentSalaryPeriod();
  const { data: salary } = useFellowshipMemberSalary();

  const salaryAmount = useMemo(() => {
    if (nonNullable(currentMember) && nonNullable(salary) && memberService.isCoreMember(currentMember)) {
      return salaryService.formatSalaryAmount(currentMember.isActive ? salary.active : salary.passive);
    }
  }, [currentMember, salary]);

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
      getRelativeTimeFromApi(currentPeriod.left, input.api, input.chain ?? undefined).then(setTimeLeft);
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
  const isSalaryRequested = nonNullable(claimStatus) && claimStatus.type === 'registered';
  const isPayoutRequested = nonNullable(claimStatus) && claimStatus.type === 'payout';

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

                      <SmallTitleText>{salaryAmount}</SmallTitleText>

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
                          ? t('fellowship.salary.salaryInfo.timeToNextCycle')
                          : t('fellowship.salary.salaryInfo.timeToWithdraw')}
                      </FootnoteText>

                      <SmallTitleText>{salaryAmount}</SmallTitleText>

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

                  <SmallTitleText>{salaryAmount}</SmallTitleText>

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
                title={getBeneficiaryName(beneficiaryValue || currentMember.accountId)}
                address={toAddress(beneficiaryValue || currentMember.accountId, { prefix: input.chain.addressPrefix })}
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
