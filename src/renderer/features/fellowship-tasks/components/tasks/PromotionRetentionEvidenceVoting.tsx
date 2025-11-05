import { useStoreMap, useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress, toRomanNumeral, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { EvidenceDetailsModal } from '@/features/fellowship-referendum-details';
import { evidenceModel } from '../../model/evidence';
import { identityModel } from '../../model/identity';
import { members } from '../../model/members';
import { MemberActivity } from '../MemberActivity';
import { TaskBadge } from '../TaskBadge';
import { TaskLabels } from '../TaskLabels';

export const evidenceVotingTaskActionSlot = createSlot<{
  evidence: Evidence;
  transaction: Transaction | null;
  endBlock: number | null;
  onClose?: () => void;
}>();

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  transaction: Transaction | null;
  tags: string[];
};

export const PromotionRetentionEvidenceVoting = memo(({ evidence, tags, endBlock, transaction }: Props) => {
  const { t } = useI18n();

  const evidenceSummaryPending = useUnit(evidenceModel.requestEvidenceSummary.pending);
  const evidenceSummaries = useUnit(evidenceModel.$evidencesSummary);
  const evidenceSummary = evidenceSummaries.find(e => e.accountId === evidence.accountId);

  const isPromotion = evidence.wish === 'Promotion';
  const isRetention = evidence.wish === 'Retention';

  const member = useStoreMap({
    store: members.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
  });

  const memberIdentity = useStoreMap({
    store: identityModel.$identities,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list[accountId] ?? null,
  });

  const rank = useMemo(() => {
    if (nullable(member?.rank)) return null;

    if (isPromotion) {
      return member.rank + 1;
    }

    return member.rank;
  }, [member, isPromotion, isRetention]);

  let title = '';
  if (isPromotion) {
    title = t('fellowship.evidenceModal.titlePromotion', {
      name: memberIdentity?.name || toShortAddress(toAddress(evidence.accountId), 6),
      rank: nonNullable(rank) ? toRomanNumeral(rank) : 0,
    });
  }
  if (isRetention) {
    title = t('fellowship.evidenceModal.titleRetention', {
      name: memberIdentity?.name || toShortAddress(toAddress(evidence.accountId), 6),
      rank: nonNullable(rank) ? toRomanNumeral(rank) : 0,
    });
  }

  return (
    <Box direction="row" gap={2}>
      <EvidenceDetailsModal evidence={evidence} transaction={transaction} title={title}>
        <button className="block w-full appearance-none p-4">
          <Box direction="row" gap={2}>
            <div className="shrink-0">
              <TaskBadge rank={rank} isPromotion={isPromotion} isRetention={isRetention} />
            </div>
            <Box gap={3} verticalAlign="space-between">
              <Box fillContainer gap={3} grow={1}>
                <Box direction="row" gap={3}>
                  <SmallTitleText className="truncate">{title}</SmallTitleText>
                  <TaskLabels tags={tags} />
                </Box>
                {!evidenceSummary?.summary && evidenceSummaryPending && evidenceSummaryPending && (
                  <Skeleton height="2.5lh" width="85%" />
                )}
                <FootnoteText as="div">
                  {evidenceSummary?.summary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
                  {!evidenceSummary?.summary && !evidenceSummaryPending
                    ? t('fellowship.tasks.task.promotionVoting.noEvidence')
                    : null}
                </FootnoteText>
              </Box>
              <MemberActivity accountId={evidence.accountId} />
            </Box>
          </Box>
        </button>
      </EvidenceDetailsModal>

      <Box alignSelf="flex-end" gap={3} padding={4} horizontalAlign="end" shrink={0}>
        <Slot id={evidenceVotingTaskActionSlot} props={{ evidence, transaction, endBlock }} />
      </Box>
    </Box>
  );
});
