import { useUnit } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { HeaderTitleText, Markdown } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { referendumDetails } from '../model/details';

import { ProposerName } from './ProposerName';

export const ReferendumDescription = () => {
  const referendumMeta = useUnit(referendumDetails.$referendumMeta);
  const pendingReferendumMeta = useUnit(referendumDetails.$pendingMeta);
  const pendingEvidence = useUnit(referendumDetails.$pendingEvidence);
  const description = useUnit(referendumDetails.$description);

  const metaLoadingState = pendingReferendumMeta && nullable(referendumMeta);

  return (
    <Box padding={6} gap={4}>
      <ProposerName />
      <HeaderTitleText className="text-balance">
        {metaLoadingState ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
      </HeaderTitleText>
      {pendingEvidence ? <Skeleton height="8lh" width="100%" /> : <Markdown>{description ?? ''}</Markdown>}
    </Box>
  );
};
