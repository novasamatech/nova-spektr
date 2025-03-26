import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, HeaderTitleText, Markdown } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';

import { ProposerName } from './ProposerName';

export const ReferendumDescription = () => {
  const { t } = useI18n();

  const referendum = useUnit(details.$referendum);
  const referendumMeta = useUnit(details.$referendumMeta);
  const pendingReferendumMeta = useUnit(details.$pendingMeta);
  const pendingEvidence = useUnit(details.$pendingEvidence);
  const evidence = useUnit(details.$evidence);
  const description = useUnit(details.$description);

  const shouldRenderTitle = pendingReferendumMeta && nullable(referendumMeta);
  const canHaveEvidence =
    nonNullable(referendum) &&
    nonNullable(referendumMeta) &&
    referendumService.isOngoing(referendum) &&
    (trackService.isPromotionTrack(referendumMeta.track) || trackService.isRetentionTrack(referendumMeta.track));
  const shouldRenderEvidence = nonNullable(evidence) && !pendingEvidence;
  const shouldRenderEvidencePending = nullable(evidence) && pendingEvidence;
  const shouldRenderEvidenceAlert = canHaveEvidence && nullable(evidence) && !pendingEvidence;

  return (
    <Box padding={6} gap={4}>
      <ProposerName />
      <HeaderTitleText className="text-balance">
        {shouldRenderTitle ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
      </HeaderTitleText>

      {pendingReferendumMeta ? <Skeleton height="1lh" width="100%" /> : null}
      {!pendingReferendumMeta && description ? <Markdown>{description}</Markdown> : null}

      {shouldRenderEvidencePending ? <Skeleton height="8lh" width="100%" /> : null}
      {shouldRenderEvidence ? <Markdown>{evidence ?? ''}</Markdown> : null}
      <Alert
        active={shouldRenderEvidenceAlert}
        variant="warn"
        title={t('fellowship.tasks.task.promotionVoting.noEvidence')}
      />
    </Box>
  );
};
