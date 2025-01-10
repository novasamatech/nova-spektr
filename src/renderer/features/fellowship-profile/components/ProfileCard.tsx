import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Skeleton, Surface, Tooltip } from '@/shared/ui-kit';
import { ERROR } from '../constants';
import { profileModel } from '../model/profile';
import { profileFeatureStatus } from '../model/status';

export const ProfileCard = memo(() => {
  useGate(profileFeatureStatus.gate);

  const { t } = useI18n();
  const featureState = useUnit(profileFeatureStatus.state);
  const featureInput = useUnit(profileFeatureStatus.input);
  const member = useUnit(profileModel.$currentMember);
  const identity = useUnit(profileModel.$identity);
  const pending = useUnit(profileModel.$pending);
  const isAccountExist = useUnit(profileModel.$isAccountExist);

  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  return (
    <Surface>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={[6, 4]}>
        <Box gap={2} width="100%">
          <Box direction="row" gap={1}>
            <Icon name="profile" size={16} />
            <FootnoteText className="text-text-secondary">{t('fellowship.yourProfile')}</FootnoteText>
          </Box>
          <Skeleton fullWidth active={pending || isNetworkDisabled}>
            {!isAccountExist && (
              <Box direction="row" gap={1} verticalAlign="center">
                <SmallTitleText className="text-text-tertiary">{t('fellowship.noAccount')}</SmallTitleText>

                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="questionOutline" size={14} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('fellowship.tooltips.noAccount', { chain: featureInput?.chain.name || '' })}
                  </Tooltip.Content>
                </Tooltip>
              </Box>
            )}

            {isAccountExist && nullable(member) && (
              <Box direction="row" gap={1} verticalAlign="center">
                <SmallTitleText className="text-text-tertiary">{t('fellowship.noProfile')}</SmallTitleText>

                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="questionOutline" size={14} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('fellowship.tooltips.noProfile')}</Tooltip.Content>
                </Tooltip>
              </Box>
            )}

            {isAccountExist && nonNullable(member) && (
              <Box direction="row" width="100%" gap={2} verticalAlign="center">
                <SmallTitleText className="w-full">
                  <Address
                    showIcon
                    iconSize={16}
                    title={identity?.name}
                    address={toAddress(member.accountId, { prefix: featureInput?.chain.addressPrefix })}
                    hideAddress
                    variant="truncate"
                  />
                </SmallTitleText>
              </Box>
            )}
          </Skeleton>
        </Box>
      </Box>
    </Surface>
  );
});
