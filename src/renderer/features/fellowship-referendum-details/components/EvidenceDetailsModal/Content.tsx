import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Alert } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Evidence, useEvidencesContent } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { Card } from '../Card';
import { NoEvidence } from '../ReferendumDescription';

type Props = {
  evidence: Evidence;
};

const useEvidenceContent = ({ accountId }: { accountId: AccountId }) => {
  const api = useFellowshipApi();

  return useEvidencesContent({ palletType: 'fellowship', api, accountId });
};

export const Content = memo(({ evidence }: Props) => {
  const { t } = useI18n();
  const { data: content, pending } = useEvidenceContent({ accountId: evidence.accountId });

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
