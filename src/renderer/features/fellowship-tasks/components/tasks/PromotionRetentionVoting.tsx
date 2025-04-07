import { useStoreMap, useUnit } from 'effector-react';
import { memo, useEffect } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant, Skeleton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { evidenceInfo } from '../../model/evidence';
import { identities } from '../../model/identity';
import { members } from '../../model/members';

export const evidenceVotingActionSlot = createSlot<{ evidence: Evidence; transaction: Transaction | null }>();

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

  const evidenceSummaryPending = useUnit(evidenceInfo.summaryPending);
  const evidenceSummaries = useUnit(evidenceInfo.$evidenceSummaries);
  const identity = useStoreMap({
    store: identities.$identities,
    keys: [evidence.accountId],
    fn: (i, [accountId]) => i[accountId] ?? null,
  });
  const member = useStoreMap({
    store: members.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
  });
  const evidenceSummary = evidenceSummaries.find(e => e.accountId === evidence.accountId);

  const firstTag = tags.at(0);
  const labelConfig = firstTag ? tagLabels[firstTag] : null;

  useEffect(() => {
    evidenceInfo.requestEvidenceSummary({
      accountId: evidence.accountId,
      isPromotion: evidence.wish === 'Promotion',
    });
    identities.request({ accountId: evidence.accountId });
  }, [evidence.accountId, evidence.wish]);

  const title =
    evidence.wish === 'Promotion'
      ? t('fellowship.tasks.task.evidence.promotionTitle', {
          identity: identity ? identityService.getFullName(identity) : toAddress(evidence.accountId),
          rank: (member?.rank ?? 0) + 1,
        })
      : t('fellowship.tasks.task.evidence.retentionTitle', {
          identity: identity ? identityService.getFullName(identity) : toAddress(evidence.accountId),
          rank: member?.rank ?? 0,
        });

  return (
    <Box direction="row" gap={10} padding={4}>
      <button
        className="block w-full appearance-none"
        onClick={() => {
          /* open evidence */
        }}
      >
        <Box fillContainer gap={3} grow={1}>
          <Box direction="row" gap={3}>
            {labelConfig ? <Label variant={labelConfig.color}>{t(labelConfig.text)}</Label> : null}
            <SmallTitleText className="truncate">{title}</SmallTitleText>
          </Box>
          {!evidenceSummary?.summary && evidenceSummaryPending && <Skeleton height="2em" width="85%" />}
          <FootnoteText>
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
      <Box alignSelf="flex-end" gap={3} horizontalAlign="end" shrink={0}>
        <Slot id={evidenceVotingActionSlot} props={{ evidence, transaction }} />
      </Box>
    </Box>
  );
});
