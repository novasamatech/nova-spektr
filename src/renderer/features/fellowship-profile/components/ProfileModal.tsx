import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, HeaderTitleText, Separator, Switch } from '@/shared/ui';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { type Member, memberService, salaryService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { fellowshipProfileFeature } from '../model/feature';
import { profile } from '../model/profile';
import { memberSalary } from '../model/salary';

import { ActivityFeed } from './ActivityFeed';
import { SetActiveModal } from './SetActiveModal';

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
      <Modal.Title close>{t('fellowship.profile.modalTitle')}</Modal.Title>
      <Modal.HeaderContent>
        <Box padding={5} gap={6}>
          <Box direction="row" verticalAlign="center" gap={2}>
            <Identicon value={member.accountId} size={48} />
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
            <Box direction="row" verticalAlign="center" gap={2}>
              {active ? (
                <FootnoteText className="text-text-positive">{t('fellowship.profile.active')}</FootnoteText>
              ) : null}
              <SetActiveModal isActive={!active} disabled={setActiveDisabled} salary={salary}>
                <div>
                  <div className="pointer-events-none">
                    <Switch
                      switchClassName={cnTw(active && 'bg-qr-valid-background')}
                      checked={active}
                      disabled={setActiveDisabled}
                    />
                  </div>
                </div>
              </SetActiveModal>
            </Box>
          </Box>
          <div className="flex items-center justify-between whitespace-nowrap">
            <DetailRow label={t('fellowship.profile.activeSalary')}>
              {salaryService.formatSalaryAmount(salary.active)}
            </DetailRow>
            <div className="w-full grow" />
            <div className="h-4.5 w-px border-r border-divider" />
            <div className="w-full grow" />
            <DetailRow label={t('fellowship.profile.passiveSalary')}>
              {salaryService.formatSalaryAmount(salary.passive)}
            </DetailRow>
          </div>
          <Slot id={profileInfoSlot} props={{ member }} />
        </Box>
        <Separator />
      </Modal.HeaderContent>
      <Modal.Content disableScroll>
        <ActivityFeed />
      </Modal.Content>
    </Modal>
  );
};
