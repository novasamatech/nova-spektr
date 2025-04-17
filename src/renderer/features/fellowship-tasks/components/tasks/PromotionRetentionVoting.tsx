import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant, Skeleton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';
import { EvidenceDetailsModal } from '../EvidenceDetailsModal/EvidenceDetailsModal';

export const evidenceVotingTaskActionSlot = createSlot<{ evidence: Evidence; transaction: Transaction | null }>();

const tagLabels: Record<string, { text: string; color: LabelVariant }> = {
  urgent: {
    text: 'fellowship.tasks.labels.urgent',
    color: 'red',
  },
  controversial: {
    text: 'fellowship.tasks.labels.controversial',
    color: 'blue',
  },
  importantVote: {
    text: 'fellowship.tasks.labels.importantVote',
    color: 'orange',
  },
};

type Props = {
  evidence: Evidence;
  transaction: Transaction | null;
  tags: string[];
};

export const PromotionRetentionVoting = memo(({ evidence, tags, transaction }: Props) => {
  const { t } = useI18n();

  const evidenceSummaryPending = useUnit(evidenceInfo.requestEvidenceSummary.pending);
  const evidenceSummaries = useUnit(evidenceInfo.$evidencesSummary);
  const evidenceSummary = evidenceSummaries.find(e => e.accountId === evidence.accountId);

  const firstTag = tags.at(0);
  const labelConfig = firstTag ? tagLabels[firstTag] : null;

  const title =
    evidence.wish === 'Promotion'
      ? t('fellowship.tasks.task.evidence.promotionTitle')
      : t('fellowship.tasks.task.evidence.retentionTitle');

  return (
    <Box direction="row" gap={10} padding={4}>
      <EvidenceDetailsModal evidence={evidence}>
        <button className="block w-full appearance-none">
          <Box fillContainer gap={3} grow={1}>
            <Box direction="row" gap={3}>
              {labelConfig ? <Label variant={labelConfig.color}>{t(labelConfig.text)}</Label> : null}
              <SmallTitleText className="truncate">{title}</SmallTitleText>
            </Box>
            {!evidenceSummary?.summary && evidenceSummaryPending && <Skeleton height="2em" width="85%" />}
            <FootnoteText as="div">
              {evidenceSummary?.summary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
              {!evidenceSummary?.summary && !evidenceSummaryPending
                ? t('fellowship.tasks.task.promotionVoting.noEvidence')
                : null}
            </FootnoteText>

            <div className="flex gap-16 text-left">
              {nonNullable(evidenceSummary?.github?.pullRequests) && (
                <div className="w-15">
                  <FootnoteText className="inline text-text-secondary">
                    {t('fellowship.tasks.task.promotionVoting.pullRequests')}
                  </FootnoteText>
                  &nbsp;
                  <span className="text-black">{evidenceSummary?.github?.pullRequests}</span>
                </div>
              )}
              {nonNullable(evidenceSummary?.github?.mergedPullRequests) && (
                <div className="w-15">
                  <FootnoteText className="inline text-text-secondary">
                    {t('fellowship.tasks.task.promotionVoting.mergedPullRequests')}
                  </FootnoteText>
                  &nbsp;
                  <span className="text-black">{evidenceSummary?.github?.mergedPullRequests}</span>
                </div>
              )}
            </div>
          </Box>
        </button>
      </EvidenceDetailsModal>

      <Box alignSelf="flex-end" gap={3} horizontalAlign="end" shrink={0}>
        <Slot id={evidenceVotingTaskActionSlot} props={{ evidence, transaction }} />
      </Box>
    </Box>
  );
});
