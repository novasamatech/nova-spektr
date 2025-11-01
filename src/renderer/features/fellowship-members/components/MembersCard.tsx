import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { ERROR } from '../constants';
import { useCoreMembers } from '../hooks/useCoreMembers';
import { fellowshipMembersFeature } from '../model/feature';

import { MembersModal } from './MembersModal';

export const MembersCard = memo(() => {
  const { t } = useI18n();

  const featureState = useUnit(fellowshipMembersFeature.state);
  const input = useUnit(fellowshipMembersFeature.input);
  const { data: members, pending } = useCoreMembers('fellowship', input?.api);

  const isNetworkDisabled = featureState.status === 'failed' && featureState.error.message === ERROR.networkDisabled;

  return (
    <MembersModal>
      <button
        className="cursor-pointer rounded-xl border border-filter-border bg-card-background text-button-small disabled:cursor-not-allowed"
        disabled={pending || isNetworkDisabled}
      >
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={4} gap={2}>
          <Skeleton active={pending && !isNetworkDisabled}>
            <Box direction="row" gap={2} verticalAlign="center">
              <Icon name="members" size={16} />
              {t('fellowship.fellow', { count: members.length })}
            </Box>
          </Skeleton>
          <Icon name="right" size={16} />
        </Box>
      </button>
    </MembersModal>
  );
});
