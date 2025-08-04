import { useGate, useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { evidenceModel } from '../../model/evidence';
import { Card } from '../Card';
import { NoEvidence } from '../ReferendumDescription';

type Props = {
  evidence: Evidence;
};

export const Content = memo(({ evidence }: Props) => {
  useGate(evidenceModel.evidenceContentFlow, { evidence });

  const { t } = useI18n();

  const content = useStoreMap({
    store: evidenceModel.$evidencesContent,
    keys: [evidence],
    fn(content, [evidence]) {
      return content.find(c => c.accountId === evidence.accountId && c.chainId === evidence.chainId);
    },
  });

  const pending = useUnit(evidenceModel.requestEvidenceContent.pending);

  if (pending && !content) {
    return (
      <Card>
        <Box padding={6}>
          <Skeleton height="446px" />
        </Box>
      </Card>
    );
  }

  if (nullable(content?.content)) {
    return <NoEvidence />;
  }

  return (
    <Card>
      <Box padding={6}>
        <Markdown>{content?.content ?? ''}</Markdown>
        <Alert
          active={nullable(content?.content)}
          variant="warn"
          title={t('fellowship.tasks.task.promotionVoting.noEvidence')}
        />
      </Box>
    </Card>
  );
});
