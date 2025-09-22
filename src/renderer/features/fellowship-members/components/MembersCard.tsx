import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { ERROR } from '../constants';
import { fellowshipMembersFeature } from '../model/feature';
import { membersModel } from '../model/members';

import { MembersModal } from './MembersModal';

export const MembersCard = memo(() => {
  const { t } = useI18n();

  const featureState = useUnit(fellowshipMembersFeature.state);
  const [members, pending] = useUnit([membersModel.$list, membersModel.$pending]);
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
