import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Alert, Markdown } from '@/shared/ui';
import { type Evidence } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';

import { Card } from './Card';

type Props = {
  evidence: Evidence;
};

export const Content = memo(({ evidence }: Props) => {
  const { t } = useI18n();

  useFlow(evidenceInfo.evidenceContentFlow, { evidence });

  const content = useStoreMap({
    store: evidenceInfo.$evidencesContent,
    keys: [evidence],
    fn(content, [evidence]) {
      return content.find(c => c.accountId === evidence.accountId && c.chainId === evidence.chainId);
    },
  });

  return (
    <Card>
      <Markdown>{content?.content ?? ''}</Markdown>
      <Alert
        active={nullable(content?.content)}
        variant="warn"
        title={t('fellowship.tasks.task.promotionVoting.noEvidence')}
      />
    </Card>
  );
});
