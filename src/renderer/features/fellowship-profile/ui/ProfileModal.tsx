import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeaderTitleText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons/IconButton/IconButton';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { type Member, memberService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { fellowshipProfileFeature } from '../model/feature';
import { profile } from '../model/profile';
import { memberSalary } from '../model/salary';

import { ActivityFeed } from './ActivityFeed';
import { SetActiveModal } from './SetActiveModal';
import { VotingRecord } from './VotingRecord';

export const profileInfoSlot = createSlot<{ member: Member }>();

export const ProfileModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const featureInput = useUnit(fellowshipProfileFeature.input);
  const member = useUnit(profile.$member);
  const account = useUnit(profile.$account);
  const identity = useUnit(profile.$identity);
  const salary = useUnit(memberSalary.$memberSalary);

  const disabled = nullable(member) || nullable(featureInput) || nullable(account);

  if (disabled) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  const active = memberService.isCoreMember(member) && member.isActive;
  const setActiveDisabled =
    !accountService.hasPermissionToMakeActions(account) || !memberService.canChangeActiveState(member);

  return (
    <Modal size="md" height="fit">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title
        close
        action={
          <ActivityFeed>
            <IconButton name="history" size={20} />
          </ActivityFeed>
        }
        gap="none"
      >
        {t('fellowship.profile.modalTitle')}
      </Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-1 bg-background-suffix-hover p-4">
          <div className="rounded-lg bg-white py-3 pr-4 pl-2">
            <div>
              <Box gap={6}>
                <Box direction="row" verticalAlign="center" gap={2}>
                  <Identicon address={toAddress(member.accountId)} size={48} />
                  <Box gap={2} grow={1}>
                    <HeaderTitleText>
                      <Account
                        accountId={member.accountId}
                        title={identity?.name}
                        chain={featureInput.chain}
                        variant="short"
                        hideIcon
                        hideAddress
                      />
                    </HeaderTitleText>
                    <Box direction="row" gap={2}>
                      <CollectiveRank rank={member.rank} showName />
                    </Box>
                  </Box>
                  <Box verticalAlign="center" horizontalAlign="flex-end" gap={2}>
                    {active ? (
                      <div className="flex items-center gap-1">
                        <span className="h-[9px] w-[9px] rounded-full bg-icon-positive" />
                        <FootnoteText>{t('fellowship.profile.active')}</FootnoteText>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="h-[9px] w-[9px] rounded-full bg-icon-negative" />
                        <FootnoteText>{t('fellowship.profile.inactive')}</FootnoteText>
                      </div>
                    )}
                    <SetActiveModal isActive={!active} disabled={setActiveDisabled} salary={salary}>
                      <div>
                        <FootnoteText className="cursor-pointer text-primary-button-background-default">
                          {t('fellowship.profile.switchStatus')}
                        </FootnoteText>
                      </div>
                    </SetActiveModal>
                  </Box>
                </Box>
              </Box>
            </div>
          </div>
          <VotingRecord />
          <div className="mt-4">
            <Slot id={profileInfoSlot} props={{ member }} />
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
