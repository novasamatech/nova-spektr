import { useUnit } from 'effector-react';
import { memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Skeleton, Tooltip } from '@/shared/ui-kit';
import { type Member, memberService } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { ERROR } from '../constants';
import { fellowshipProfileFeature } from '../model/feature';
import { profile } from '../model/profile';

import { ProfileModal } from './ProfileModal';

export const additionalProfileCardInfoSlot = createSlot<{ member: Member }>();

export const ProfileCard = memo(() => {
  const { t } = useI18n();
  const featureState = useUnit(fellowshipProfileFeature.state);
  const input = useUnit(fellowshipProfileFeature.input);
  const member = useUnit(profile.$member);
  const identity = useUnit(profile.$identity);
  const pending = useUnit(profile.$pending);
  const isAccountExist = useUnit(profile.$isAccountExist);

  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;
  const disabled = !isAccountExist || nullable(member);

  return (
    <ProfileModal>
      <div
        className={cnTw('cursor-pointer rounded-xl border border-filter-border bg-card-background text-button-small', {
          'text-text-tertiary': disabled,
        })}
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
                    {t('fellowship.tooltips.noAccount', { chain: input?.chain.name || '' })}
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
                  iconSize={18}
                  title={identity ? identityService.getFullName(identity) : undefined}
                  address={toAddress(member.accountId, { prefix: input?.chain.addressPrefix })}
                  hideAddress
                  variant="truncate"
                />

                <Slot id={additionalProfileCardInfoSlot} props={{ member }} />

                {memberService.isCoreMember(member) && member.isActive && (
                  <FootnoteText className="text-text-positive">{t('fellowship.members.active')}</FootnoteText>
                )}

                <Icon name="right" size={16} />
              </Box>
            )}
          </Skeleton>
        </Box>
      </div>
    </ProfileModal>
  );
});
