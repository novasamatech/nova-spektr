import { useStoreMap, useUnit } from 'effector-react';
import { memo, useEffect } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';
import { referendums } from '../../model/referendums';
import { tracks } from '../../model/tracks';

import { taskVotingActionSlot } from './OngoingReferendumVoting';

const tagLabels: Record<string, { text: string; color: LabelVariant }> = {
  urgent: {
    text: 'fellowship.tasks.labels.urgent',
    color: 'purple',
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
    const evidencePending = useUnit(referendums.$evidencePending);
    const evidences = useUnit(evidenceInfo.$evidences);
    const meta = useStoreMap({
      store: referendums.$metadata,
      keys: [referendum.id],
      fn: (meta, [id]) => meta[id] ?? null,
    });

    const track = allTacks.find(t => t.id === referendum.track);

    const proposerAccountId = referendumService.getProposer(referendum);
    const evidence = evidences.find(e => e.accountId === proposerAccountId);

    const firstTag = tags.at(0);
    const labelConfig = firstTag ? tagLabels[firstTag] : null;

    const isRetentionTrack = track ? trackService.isRetentionTrack(track.id) : false;
    const isPromotionTrack = track ? trackService.isPromotionTrack(track.id) : false;

    useEffect(() => {
      referendums.requestEvidenceSummaryFx({
        accountId: proposerAccountId as AccountId,
        isPromotion: isPromotionTrack,
      });
    }, [proposerAccountId, isPromotionTrack]);

    let staticTitle = t('fellowship.tasks.task.anyReferendum.title');
    if (isRetentionTrack) {
      staticTitle = t('fellowship.tasks.task.retentionVoting.title');
    } else if (isPromotionTrack) {
      staticTitle = t('fellowship.tasks.task.promotionVoting.title');
    }

    return (
      <Box direction="row" gap={10} padding={4}>
        <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
          <Box fillContainer gap={3} grow={1}>
            <Box direction="row" gap={3}>
              {labelConfig ? <Label variant={labelConfig.color}>{t(labelConfig.text)}</Label> : null}
              <SmallTitleText className="truncate">{meta?.title ?? staticTitle}</SmallTitleText>
            </Box>
            {!evidence?.summary && evidencePending && <Skeleton height="2em" width="85%" />}
            <FootnoteText>
              {evidence?.summary ? <Markdown>{evidence?.summary}</Markdown> : null}
              {!evidence?.summary && !evidencePending ? t('fellowship.tasks.task.promotionVoting.noEvidence') : null}
            </FootnoteText>

            <div className="flex gap-16 text-left">
              {evidence?.github?.pullRequests && (
                <div className="w-15">
                  <FootnoteText className="inline text-text-secondary">
                    {t('fellowship.tasks.task.promotionVoting.pullRequests')}
                  </FootnoteText>
                  &nbsp;
                  <span className="text-black">{evidence?.github?.pullRequests}</span>
                </div>
              )}
              {evidence?.github?.mergedPullRequests && (
                <div className="w-15">
                  <FootnoteText className="inline text-text-secondary">
                    {t('fellowship.tasks.task.promotionVoting.mergedPullRequests')}
                  </FootnoteText>
                  &nbsp;
                  <span className="text-black">{evidence?.github?.mergedPullRequests}</span>
                </div>
              )}
            </div>
          </Box>
        </button>
        <Box alignSelf="flex-end" shrink={0}>
          <Slot id={taskVotingActionSlot} props={{ referendum, transaction }} />
        </Box>
      </Box>
    );
  },
);
