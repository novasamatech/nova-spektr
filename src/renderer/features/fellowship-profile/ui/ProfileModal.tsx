import { type PropsWithChildren } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { Button, HeaderTitleText } from '@/shared/ui';
import { IconButton } from '@/shared/ui/Buttons/IconButton/IconButton';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { type Member, memberService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { useFellowshipAccount, useFellowshipMember, useFellowshipMemberSalary } from '@/aggregates/fellowship-member';
import { useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';

import { ActiveIndicator } from './ActiveIndicator';
import { ActivityFeed } from './ActivityFeed';
import { Alerts } from './Alerts';
import { SetActiveModal } from './SetActiveModal';
import { VotingRecord } from './VotingRecord';

export const profileInfoSlot = createSlot<{ member: Member }>();

export const ProfileModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const { data: member } = useFellowshipMember();
  const { data: account } = useFellowshipAccount();
  const { data: identity } = useFellowshipIdentity(member?.accountId);
  const { data: salary } = useFellowshipMemberSalary();

  const disabled = nullable(member) || nullable(account) || nullable(chain);

  if (disabled) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  const active = memberService.isCoreMember(member) && member.isActive;
  const canChangeActiveState =
    accountService.hasPermissionToMakeActions(account) && memberService.canChangeActiveState(member);

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
          <Alerts />

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
                        chain={chain}
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
                    <ActiveIndicator isActive={active} />

                    {nonNullable(salary) && (
                      <SetActiveModal isActive={!active} disabled={!canChangeActiveState} salary={salary}>
                        <Button
                          variant="text"
                          pallet="primary"
                          disabled={!canChangeActiveState}
                          size="sm"
                          className="p-0"
                        >
                          {t('fellowship.profile.switchStatus')}
                        </Button>
                      </SetActiveModal>
                    )}
                  </Box>
                </Box>
              </Box>
            </div>
          </div>
          <VotingRecord />
          <div className="mt-4 flex flex-col gap-4">
            <Slot id={profileInfoSlot} props={{ member }} />
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
