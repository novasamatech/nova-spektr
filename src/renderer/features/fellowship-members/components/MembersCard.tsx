import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton, Surface } from '@/shared/ui-kit';
import { ERROR } from '../constants';
import { membersModel } from '../model/members';
import { membersFeatureStatus } from '../model/status';

import { MembersModal } from './MembersModal';

type Props = {
  // TODO replace with internal modal openning
  onClick: () => void;
};

export const MembersCard = memo<Props>(({ onClick }) => {
  useGate(membersFeatureStatus.gate);

  const { t } = useI18n();

  const featureState = useUnit(membersFeatureStatus.state);
  const [members, pending, fulfilled] = useUnit([membersModel.$list, membersModel.$pending, membersModel.$fulfilled]);
  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  return (
    <MembersModal>
      <Surface as="button" disabled={pending || isNetworkDisabled} onClick={onClick}>
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={[6, 4]}>
          <Box gap={2}>
            <Box direction="row" gap={1}>
              <Icon name="members" size={16} />
              <FootnoteText className="text-text-secondary">{t('fellowship.members.cardTitle')}</FootnoteText>
            </Box>
            <Skeleton active={pending && !fulfilled && !isNetworkDisabled}>
              <SmallTitleText>{t('fellowship.fellow', { count: members.length })}</SmallTitleText>
            </Skeleton>
          </Box>
          <Icon name="arrowRight" />
        </Box>
      </Surface>
    </MembersModal>
  );
});
