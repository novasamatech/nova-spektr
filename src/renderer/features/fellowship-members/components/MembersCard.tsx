import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, SmallTitleText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { membersModel } from '../model/members';
import { membersFeatureStatus } from '../model/status';

type Props = {
  // TODO replace with internal modal openning
  onClick: () => void;
};

export const MembersCard = memo<Props>(({ onClick }) => {
  useGate(membersFeatureStatus.gate);

  const { t } = useI18n();
  const [members, pending, fulfilled] = useUnit([membersModel.$list, membersModel.$pending, membersModel.$fulfilled]);

  return (
    <Surface disabled={pending} onClick={onClick}>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={[6, 4]}>
        <Box gap={2}>
          <Box direction="row" gap={1}>
            <Icon name="members" size={16} />
            <FootnoteText>{t('fellowship.members')}</FootnoteText>
          </Box>
          <Skeleton active={pending && !fulfilled}>
            <SmallTitleText>{t('fellowship.fellow', { count: members.length })}</SmallTitleText>
          </Skeleton>
        </Box>

        <Icon name="arrowRight" />
      </Box>
    </Surface>
  );
});
