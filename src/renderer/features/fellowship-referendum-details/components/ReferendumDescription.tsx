import { useUnit } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { HeaderTitleText, Markdown } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { details } from '../model/details';

import { ProposerName } from './ProposerName';

export const ReferendumDescription = () => {
  const referendumMeta = useUnit(details.$referendumMeta);
  const pendingReferendumMeta = useUnit(details.$pendingMeta);
  const pendingEvidence = useUnit(details.$pendingEvidence);
  const evidence = useUnit(details.$evidence);
  const description = useUnit(details.$description);

  const metaLoadingState = pendingReferendumMeta && nullable(referendumMeta);

  return (
    <Box padding={6} gap={4}>
      <ProposerName />
      <HeaderTitleText className="text-balance">
        {metaLoadingState ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
      </HeaderTitleText>

      {pendingReferendumMeta ? <Skeleton height="1lh" width="100%" /> : null}
      {!pendingReferendumMeta && description ? <Markdown>{description}</Markdown> : null}

      {pendingEvidence ? <Skeleton height="8lh" width="100%" /> : null}
      {!pendingEvidence && evidence ? <Markdown>{evidence ?? ''}</Markdown> : null}
    </Box>
  );
};
