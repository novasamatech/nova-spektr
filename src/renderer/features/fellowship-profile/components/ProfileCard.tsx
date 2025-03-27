import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, Identicon, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, Hash } from '@/shared/ui-entities';
import { Box, Skeleton, Tooltip } from '@/shared/ui-kit';
import { type Member, memberService } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { ERROR } from '../constants';
import { fellowshipProfileFeature } from '../model/feature';
import { profile } from '../model/profile';

import { ProfileModal } from './ProfileModal';

export const additionalProfileCardInfoSlot = createSlot();

export const ProfileCard = memo(() => {
  return (
    <ProfileLoader>
      <NoAccount />
      <NoProfile />
      <Member />
    </ProfileLoader>
  );
});

type CardProps = {
  padding?: boolean;
};
const Card = ({ padding = true, children }: PropsWithChildren<CardProps>) => {
  return (
    <div
      className={cnTw(
        'rounded-xl border border-filter-border bg-card-background text-button-small',
        padding ? 'p-4' : 'p-0',
      )}
    >
      {children}
    </div>
  );
};

const ProfileLoader = ({ children }: PropsWithChildren) => {
  const pending = useUnit(profile.$pending);
  const featureState = useUnit(fellowshipProfileFeature.state);

  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.NETWORK_DISABLED;

  if (!pending && !isNetworkDisabled) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }

  return (
    <Card padding={false}>
      <div className="divider flex h-11 items-center justify-between border-b border-filter-border px-4">
        <Skeleton height={5} />
      </div>

      <Box padding={4}>
        <Skeleton height={27} />
      </Box>
    </Card>
  );
};

const NoAccount = () => {
  const { t } = useI18n();

  const input = useUnit(fellowshipProfileFeature.input);
  const isAccountExist = useUnit(profile.$isAccountExist);

  if (isAccountExist) return null;

  return (
    <Card>
      <Box direction="row" verticalAlign="center" gap={2}>
        <Icon name="emptyIdenticon" size={20} />
        <span className="text-button-small text-text-secondary">{t('fellowship.noAccount')}</span>

        <Tooltip>
          <Tooltip.Trigger>
            <div tabIndex={0} className="ml-auto">
              <Icon name="questionOutline" size={14} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('fellowship.tooltips.noAccount', { chain: input?.chain.name || '' })}</Tooltip.Content>
        </Tooltip>
      </Box>
    </Card>
  );
};

const NoProfile = () => {
  const { t } = useI18n();

  const member = useUnit(profile.$member);
  const isAccountExist = useUnit(profile.$isAccountExist);

  if (!isAccountExist || nonNullable(member)) return null;

  return (
    <Card>
      <Box direction="row" verticalAlign="center" gap={2}>
        <Icon name="emptyIdenticon" size={20} />
        <span className="text-button-small text-text-secondary">{t('fellowship.noProfile')}</span>

        <Tooltip>
          <Tooltip.Trigger>
            <div tabIndex={0} className="ml-auto">
              <Icon name="questionOutline" size={14} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('fellowship.tooltips.noProfile')}</Tooltip.Content>
        </Tooltip>
      </Box>
    </Card>
  );
};

const Member = () => {
  const { t } = useI18n();

  const member = useUnit(profile.$member);
  const track = useUnit(profile.$track);
  const identity = useUnit(profile.$identity);
  const isAccountExist = useUnit(profile.$isAccountExist);
  const input = useUnit(fellowshipProfileFeature.input);
  const profileDetails = useUnit(profile.$profileDetails);
  const pendingDetails = useUnit(profile.$pendingDetails);

  if (!isAccountExist || nullable(member)) return null;

  return (
    <Card padding={false}>
      <div className="divider flex h-11 items-center justify-between border-b border-filter-border pl-4 pr-1">
        <span className="text-button-small">{t('fellowship.members.myProfile')}</span>

        <ProfileModal>
          <Button variant="text" pallet="primary" size="sm">
            {t('fellowship.members.viewDetails')}
          </Button>
        </ProfileModal>
      </div>

      <Box direction="column" gap={5} padding={4}>
        <Box direction="row" verticalAlign="center" gap={2}>
          <Identicon
            size={32}
            background={false}
            address={toAddress(member.accountId, { prefix: input?.chain.addressPrefix })}
          />
          <Box direction="column" gap={1} width="100%">
            <Box direction="row" horizontalAlign="space-between" gap={2}>
              <BodyText>
                {identity ? (
                  identityService.getFullName(identity)
                ) : (
                  <Hash value={toAddress(member.accountId, { prefix: input?.chain.addressPrefix })} variant="short" />
                )}
              </BodyText>

              {memberService.isCoreMember(member) && member.isActive ? (
                <Box direction="row" verticalAlign="center" gap={1} shrink={0}>
                  <span className="h-[9px] w-[9px] rounded-full bg-icon-positive" />
                  <FootnoteText>{t('fellowship.members.active')}</FootnoteText>
                </Box>
              ) : null}
            </Box>

            <CollectiveRank rank={member.rank ?? 0}>{track?.name.replace(/s$/, '')}</CollectiveRank>
          </Box>
        </Box>

        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          <FootnoteText className="text-text-secondary">{t('fellowship.members.activity')}</FootnoteText>
          <FootnoteText className="text-text-secondary">{t('fellowship.members.agreement')}</FootnoteText>
          <FootnoteText className="text-text-secondary">{t('fellowship.members.toNextRank')}</FootnoteText>
          {pendingDetails ? (
            <>
              <Skeleton height={4.5} />
              <Skeleton height={4.5} />
              <Skeleton height={4.5} />
            </>
          ) : (
            <>
              <SmallTitleText>
                {nonNullable(profileDetails.activity) ? `${profileDetails.activity}%` : 'N/A'}
              </SmallTitleText>
              <SmallTitleText>
                {nonNullable(profileDetails.agreement) ? `${profileDetails.agreement}%` : 'N/A'}
              </SmallTitleText>
              <SmallTitleText>
                <Slot id={additionalProfileCardInfoSlot} />
              </SmallTitleText>
            </>
          )}
        </div>
      </Box>
    </Card>
  );
};
