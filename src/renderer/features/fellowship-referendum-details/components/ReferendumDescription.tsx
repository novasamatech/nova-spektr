import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Referendum, trackService } from '@/domains/collectives';
import { details } from '../model/details';

import { AdditionalContext } from './AdditionalContext';
import { Card } from './Card';

type Props = {
  referendum: Referendum | null;
};

export const ReferendumDescription = memo(({ referendum }: Props) => {
  useFlow(details.flow, { referendum });

  const referendumMeta = useUnit(details.$referendumMeta);
  const pendingEvidence = useUnit(details.$pendingEvidence);
  const evidence = useUnit(details.$evidence);

  const canHaveEvidence =
    nonNullable(referendum) &&
    nonNullable(referendumMeta) &&
    (trackService.isPromotionTrack(referendumMeta.track) || trackService.isRetentionTrack(referendumMeta.track));

  const shouldRenderEvidence = nonNullable(evidence) && !pendingEvidence;
  const shouldRenderEvidencePending = canHaveEvidence && nullable(evidence) && pendingEvidence;
  const shouldRenderEvidenceAlert = canHaveEvidence && nullable(evidence) && !pendingEvidence;

  return (
    <>
      {shouldRenderEvidencePending ? <Skeleton height="16lh" width="100%" /> : null}
      {shouldRenderEvidence ? (
        <Card>
          <Box padding={6}>
            <Markdown>{evidence.content ?? ''}</Markdown>
          </Box>
        </Card>
      ) : null}

      {shouldRenderEvidenceAlert ? <NoEvidence /> : null}

      <AdditionalContext />
    </>
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
