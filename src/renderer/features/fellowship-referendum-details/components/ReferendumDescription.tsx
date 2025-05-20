import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, Markdown, TitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type Referendum, referendumService, trackService } from '@/domains/collectives';
import { details } from '../model/details';

import { Card } from './Card';
import { ProposerName } from './ProposerName';

type Props = {
  referendum: Referendum | null;
};

export const ReferendumDescription = memo(({ referendum }: Props) => {
  useFlow(details.flow, { referendum });
  const { t } = useI18n();

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
    <>
      <Card>
        <Box padding={6} gap={4}>
          <ProposerName />
          <TitleText className="text-balance">
            {shouldRenderTitle ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
          </TitleText>
          {pendingReferendumMeta ? <Skeleton height="1lh" width="100%" /> : null}
          {!pendingReferendumMeta && description ? <Markdown>{description}</Markdown> : null}
        </Box>
      </Card>

      {shouldRenderEvidencePending ? <Skeleton height="8lh" width="100%" /> : null}
      {shouldRenderEvidence ? (
        <Card>
          <Box padding={6}>
            <Markdown>{evidence ?? ''}</Markdown>
          </Box>
        </Card>
      ) : null}

      <Alert
        active={shouldRenderEvidenceAlert}
        variant="warn"
        title={t('fellowship.tasks.task.promotionVoting.noEvidence')}
      />
    </>
  );
});
