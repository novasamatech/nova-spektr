import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { useEvidenceContent } from '../hooks/useEvidenceContent';
import { useMetadata } from '../hooks/useMetadata';

import { AdditionalContext } from './AdditionalContext';
import { Card } from './Card';
import { ConnectedGovernanceReferendum } from './ConnectedGovernanceReferendum';
import { TechnicalDetails } from './TechnicalDetails';

type Props = {
  referendum: Referendum | null;
  evidence: Evidence | null;
};

export const ReferendumDescription = memo(({ referendum, evidence }: Props) => {
  const { data: referendumMeta } = useMetadata(referendum);
  const { data: evidenceContent, pending: pendingEvidenceContent } = useEvidenceContent({ referendum, evidence });

  const canHaveEvidence =
    nonNullable(referendum) &&
    nonNullable(referendumMeta) &&
    (trackService.isPromotionTrack(referendumMeta.track) || trackService.isRetentionTrack(referendumMeta.track));

  const shouldRenderEvidence = nonNullable(evidenceContent) && !pendingEvidenceContent;
  const shouldRenderEvidencePending =
    canHaveEvidence && nullable(evidenceContent) && pendingEvidenceContent && nonNullable(evidence);
  const shouldRenderEvidenceAlert =
    canHaveEvidence && nullable(evidenceContent) && (!pendingEvidenceContent || nullable(evidence));

  const ongoingReferendum = nonNullable(referendum) && referendumService.isOngoing(referendum) ? referendum : null;

  return (
    <div className="flex h-full flex-col gap-4">
      {shouldRenderEvidencePending ? (
        <Card>
          <Box padding={6}>
            <Skeleton height="16lh" width="100%" />
          </Box>
        </Card>
      ) : null}
      {shouldRenderEvidence ? (
        <Card>
          <Box padding={6}>
            <Markdown>{evidenceContent.content ?? ''}</Markdown>
          </Box>
        </Card>
      ) : null}

      {shouldRenderEvidenceAlert ? <NoEvidence /> : null}

      {ongoingReferendum && <TechnicalDetails referendum={ongoingReferendum} />}

      {nonNullable(referendum) && <ConnectedGovernanceReferendum referendum={referendum} />}
      <div className="flex-1">
        <AdditionalContext referendum={referendum} />
      </div>
    </div>
  );
});

export const NoEvidence = () => {
  const { t } = useI18n();
  return (
    <Card>
      <Box padding={[43, 10]} gap={2} horizontalAlign="center" verticalAlign="center">
        <Icon size={64} name="empty" className="mb-4" />
        <SmallTitleText>{t('fellowship.tasks.task.promotionVoting.noEvidence')}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">
          {t('fellowship.tasks.task.promotionVoting.noEvidenceDescription')}
        </FootnoteText>
      </Box>
    </Card>
  );
};
