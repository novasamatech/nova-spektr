import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Skeleton, Tooltip } from '@/shared/ui-kit';
import { membersService } from '@/domains/collectives';
import { ERROR } from '../constants';
import { fellowshipProfileFeature } from '../model/feature';
import { profileModel } from '../model/profile';

import { ProfileModal } from './ProfileModal';

export const ProfileCard = memo(() => {
  const { t } = useI18n();
  const featureState = useUnit(fellowshipProfileFeature.state);
  const featureInput = useUnit(fellowshipProfileFeature.input);
  const member = useUnit(profileModel.$currentMember);
  const identity = useUnit(profileModel.$identity);
  const pending = useUnit(profileModel.$pending);
  const isAccountExist = useUnit(profileModel.$isAccountExist);

  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;
  const disabled = !isAccountExist || nullable(member);

  return (
    <ProfileModal>
      <button
        className={cnTw('rounded-xl border border-filter-border bg-card-background text-button-small', {
          'text-text-tertiary': disabled,
        })}
        disabled={disabled}
      >
        <Box direction="row" verticalAlign="center" padding={4}>
          <Skeleton fullWidth active={pending || isNetworkDisabled}>
            {!isAccountExist && (
              <Box direction="row" gap={1} verticalAlign="center">
                {t('fellowship.noAccount')}

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
                {t('fellowship.noProfile')}

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
                <Address
                  showIcon
                  iconSize={20}
                  title={identity?.name}
                  address={toAddress(member.accountId, { prefix: featureInput?.chain.addressPrefix })}
                  hideAddress
                  variant="truncate"
                />

                {membersService.isCoreMember(member) && member.isActive && (
                  <FootnoteText className="text-text-positive">{t('fellowship.members.active')}</FootnoteText>
                )}

                <Icon name="right" size={16} />
              </Box>
            )}
          </Skeleton>
        </Box>
      </button>
    </ProfileModal>
  );
});
