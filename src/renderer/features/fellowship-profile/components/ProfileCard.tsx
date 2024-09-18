import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, Icon, SmallTitleText } from '@shared/ui';
import { Box, Skeleton, Surface } from '@shared/ui-kit';
import { profileModel } from '../model/profile';
import { profileFeatureStatus } from '../model/status';

type Props = {
  // TODO replace with internal modal openning
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
            <FootnoteText className="text-text-secondary">{t('fellowship.yourProfile')}</FootnoteText>
          </Box>
          <Skeleton active={pending && !fulfilled}>
            {fellowshipAccount ? (
              <SmallTitleText>
                {/* TODO: change to identity */}
                {fellowshipAccount.accountId}
              </SmallTitleText>
            ) : (
              <SmallTitleText className="text-text-tertiary">{t('fellowship.noProfile')}</SmallTitleText>
            )}
          </Skeleton>
        </Box>

        {fellowshipAccount ? <Icon name="arrowRight" /> : null}
      </Box>
    </Surface>
  );
});
