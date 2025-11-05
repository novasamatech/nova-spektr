import { memo, useMemo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress, toRomanNumeral, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Markdown, Skeleton } from '@/shared/ui-kit';
import { type Evidence, useEvidenceSummary, useMember } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';
import { MemberActivity } from '../MemberActivity';
import { TaskBadge } from '../TaskBadge';
import { TaskLabels } from '../TaskLabels';

export const evidenceDetailsModalSlot = createSlot<{
  evidence: Evidence;
  title: string;
  children: React.ReactNode;
  transaction: Transaction | null;
}>();
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

  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member } = useMember({ palletType: 'fellowship', api, accountId: evidence.accountId });
  const { data: evidenceSummary, pending: pendingSummary } = useEvidenceSummary({
    palletType: 'fellowship',
    chainId: chain?.chainId,
    accountId: evidence?.accountId,
    evidence: evidence?.hash,
  });

  const { data: identity } = useFellowshipIdentity(member?.accountId);

  const isPromotion = evidence.wish === 'Promotion';
  const isRetention = evidence.wish === 'Retention';

  const rank = useMemo(() => {
    if (nullable(member)) return null;

    if (isPromotion) {
      return member.rank + 1;
    }

    return member.rank;
  }, [member, isPromotion, isRetention]);

  let title = '';
  if (isPromotion) {
    title = t('fellowship.evidenceModal.titlePromotion', {
      name: identity?.name || toShortAddress(toAddress(evidence.accountId), 6),
      rank: nonNullable(rank) ? toRomanNumeral(rank) : 0,
    });
  }
  if (isRetention) {
    title = t('fellowship.evidenceModal.titleRetention', {
      name: identity?.name || toShortAddress(toAddress(evidence.accountId), 6),
      rank: nonNullable(rank) ? toRomanNumeral(rank) : 0,
    });
  }

  return (
    <Box direction="row" gap={2}>
      <Slot
        id={evidenceDetailsModalSlot}
        props={{
          evidence,
          title,
          transaction,
          children: (
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
                    {!evidenceSummary?.summary && pendingSummary && <Skeleton height="2.5lh" width="85%" />}
                    <FootnoteText as="div">
                      {evidenceSummary?.summary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
                      {!evidenceSummary?.summary && !pendingSummary
                        ? t('fellowship.tasks.task.promotionVoting.noEvidence')
                        : null}
                    </FootnoteText>
                  </Box>
                  <MemberActivity accountId={evidence.accountId} />
                </Box>
              </Box>
            </button>
          ),
        }}
      />

      <Box alignSelf="flex-end" gap={3} padding={4} horizontalAlign="end" shrink={0}>
        <Slot id={evidenceVotingTaskActionSlot} props={{ evidence, transaction, endBlock }} />
      </Box>
    </Box>
  );
});
