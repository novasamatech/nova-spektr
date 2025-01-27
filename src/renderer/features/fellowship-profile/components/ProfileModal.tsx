import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeaderTitleText, Identicon, Separator, Switch } from '@/shared/ui';
import { Account, CollectivesRank } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { membersService } from '@/domains/collectives';
import { fellowshipProfileFeature } from '../model/feature';
import { profile } from '../model/profile';

import { SetActiveModal } from './SetActiveModal';

export const ProfileModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const featureInput = useUnit(fellowshipProfileFeature.input);
  const member = useUnit(profile.$currentMember);
  const identity = useUnit(profile.$identity);

  const disabled = nullable(member) || nullable(featureInput);

  if (disabled) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  const address = toAddress(member.accountId, { prefix: featureInput.chain.addressPrefix });
  const active = membersService.isCoreMember(member) && member.isActive;
  const setActiveDisabled = !membersService.isCoreMember(member);

  return (
    <Modal size="md" height="fit">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.profile.modalTitle')}</Modal.Title>
      <Modal.HeaderContent>
        <Box direction="row" verticalAlign="center" padding={5} gap={2}>
          <Identicon address={address} size={48} />
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
              <CollectivesRank rank={member.rank} />
              <FootnoteText className="text-text-secondary">{t('fellowship.profile.fellow')}</FootnoteText>
            </Box>
          </Box>
          <Box direction="row" verticalAlign="center" gap={2}>
            {active ? (
              <FootnoteText className="text-text-positive">{t('fellowship.profile.active')}</FootnoteText>
            ) : null}
            <SetActiveModal isActive={!active} disabled={setActiveDisabled}>
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
        <Separator />
      </Modal.HeaderContent>
      <Modal.Content></Modal.Content>
    </Modal>
  );
};
