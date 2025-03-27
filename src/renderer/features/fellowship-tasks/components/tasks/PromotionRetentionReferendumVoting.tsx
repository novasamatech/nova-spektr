import { useStoreMap, useUnit } from 'effector-react';
import { memo, useEffect } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';
import { referendums } from '../../model/referendums';
import { tracks } from '../../model/tracks';
import { ReferendumEndTimer } from '../ReferendumEndTimer';

import { taskVotingActionSlot } from './OngoingReferendumVoting';

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
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
  onReferendumSelect(referendum: Referendum): void;
};

export const PromotionRetentionReferendumVoting = memo(
  ({ referendum, tags, transaction, onReferendumSelect }: Props) => {
    const { t } = useI18n();

    const allTacks = useUnit(tracks.$tracks);
    const evidenceSummaryPending = useUnit(evidenceInfo.summaryPending);
    const evidenceSummaries = useUnit(evidenceInfo.$evidenceSummaries);
    const meta = useStoreMap({
      store: referendums.$metadata,
      keys: [referendum.id],
      fn: (meta, [id]) => meta[id] ?? null,
    });

    const track = allTacks.find(t => t.id === referendum.track);

    const proposerAccountId = referendumService.getProposer(referendum);
    const evidenceSummary = evidenceSummaries.find(e => e.accountId === proposerAccountId);

    const firstTag = tags.at(0);
    const labelConfig = firstTag ? tagLabels[firstTag] : null;

    const isPromotionTrack = track ? trackService.isPromotionTrack(track.id) : false;

    useEffect(() => {
      if (proposerAccountId) {
        evidenceInfo.requestEvidenceSummary({
          accountId: proposerAccountId,
          isPromotion: isPromotionTrack,
        });
      }
    }, [proposerAccountId, isPromotionTrack]);

    const title = meta?.title ?? t('governance.referendums.referendumTitle');

    return (
      <Box direction="row" gap={10} padding={4}>
        <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
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
              {evidenceSummary?.github?.pullRequests && (
                <div className="w-15">
                  <FootnoteText className="inline text-text-secondary">
                    {t('fellowship.tasks.task.promotionVoting.pullRequests')}
                  </FootnoteText>
                  &nbsp;
                  <span className="text-black">{evidenceSummary?.github?.pullRequests}</span>
                </div>
              )}
              {evidenceSummary?.github?.mergedPullRequests && (
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
          <ReferendumEndTimer endBlock={referendum.ends} referendumType="general" shortDateFormat />
          <Slot id={taskVotingActionSlot} props={{ referendum, transaction }} />
        </Box>
      </Box>
    );
  },
);
