import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, Icon } from '@/shared/ui';
import { CollectiveRank, Hash, Identicon } from '@/shared/ui-entities';
import { Box, Skeleton, Tooltip } from '@/shared/ui-kit';
import { type Member, memberService } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import {
  useFellowshipChain,
  useFellowshipChainConnected,
  useFellowshipIdentity,
} from '@/aggregates/fellowship-network';
import { fellowshipProfileFeature } from '../model/feature';

import { ActiveIndicator } from './ActiveIndicator';
import { ProfileModal } from './ProfileModal';
import { VotingRecordWidget } from './VotingRecord';

export const ProfileCard = memo(() => {
  const { data: currentMember, pending } = useFellowshipMember();
  const { data: account } = useFellowshipAccount();
  const connected = useFellowshipChainConnected();

  const isAccountExist = nonNullable(account);

  const shouldRenderLoading = pending || !connected;
  const shouldRenderEmptyAccount = !isAccountExist && !pending;
  const shouldRenderEmptyMember = isAccountExist && nullable(currentMember);
  const shouldRenderMember = nonNullable(currentMember);

  return (
    <ProfileLoader active={shouldRenderLoading}>
      {shouldRenderEmptyAccount ? <NoAccount /> : null}
      {shouldRenderEmptyMember ? <NoProfile /> : null}
      {shouldRenderMember ? <Member /> : null}
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

const ProfileLoader = ({ active, children }: PropsWithChildren<{ active: boolean }>) => {
  if (!active) {
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

  const { data: member } = useFellowshipMember();
  const { data: account } = useFellowshipAccount();
  const isAccountExist = nonNullable(account);

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

  const chain = useFellowshipChain();
  const { data: member } = useFellowshipMember();
  const { data: identity } = useFellowshipIdentity(member?.accountId);

  if (nullable(member)) return null;

  return (
    <Card padding={false}>
      <div className="divider flex h-11 items-center justify-between border-b border-filter-border pr-1 pl-4">
        <span className="text-button-small">{t('fellowship.members.myProfile')}</span>

        <ProfileModal>
          <Button variant="text" pallet="primary" size="sm">
            {t('fellowship.members.viewDetails')}
          </Button>
        </ProfileModal>
      </div>

      <Box direction="column" gap={5} padding={4}>
        <Box direction="row" verticalAlign="center" gap={2}>
          <Identicon size={32} background={false} address={toAddress(member.accountId)} />
          <Box direction="column" gap={1} width="100%">
            <Box direction="row" horizontalAlign="space-between" gap={2}>
              <BodyText>
                {identity ? (
                  identityService.getFullName(identity)
                ) : (
                  <Hash value={toAddress(member.accountId, { prefix: chain?.addressPrefix })} variant="short" />
                )}
              </BodyText>

              {memberService.isCoreMember(member) && <ActiveIndicator isActive={member.isActive} />}
            </Box>

            <CollectiveRank rank={member.rank ?? 0} showName />
          </Box>
        </Box>

        <VotingRecordWidget />
      </Box>
    </Card>
  );
};
