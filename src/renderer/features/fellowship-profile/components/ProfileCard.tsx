import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, SmallTitleText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { profileModel } from '../model/profile';
import { profileFeatureStatus } from '../model/status';

type Props = {
  onClick: () => void;
};

export const ProfileCard = memo<Props>(({ onClick }) => {
  useGate(profileFeatureStatus.gate);

  const { t } = useI18n();
  const [fellowshipAccount, pending, fulfilled] = useUnit([
    profileModel.$account,
    profileModel.$pending,
    profileModel.$fulfilled,
  ]);

  return (
    <Surface disabled={pending} onClick={onClick}>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={[6, 4]}>
        <Box gap={2}>
          <Box direction="row" gap={1}>
            <Icon name="profile" size={16} />
            <FootnoteText>{t('fellowship.yourProfile')}</FootnoteText>
          </Box>
          <Skeleton active={pending && !fulfilled}>
            <SmallTitleText>
              {/* TODO: change to identity */}
              {fellowshipAccount ? fellowshipAccount.accountId : t('fellowship.noProfile')}
            </SmallTitleText>
          </Skeleton>
        </Box>

        <Icon name="arrowRight" />
      </Box>
    </Surface>
  );
});
