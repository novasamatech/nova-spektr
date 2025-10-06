import { formatDate } from 'date-fns';
import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, type ReactNode, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, TitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type Member, type Referendum, votingHistoryService } from '@/domains/collectives';
import { WidgetState, fellowshipPromotion } from '../models/promotion';
import { votesModel } from '../models/votes';

import { TimelineWithRanks } from './TimelineWithRanks';
import { TimerToBlock } from './TimerToBlock';

export const referendumWidgetActionSlot = createSlot<{ referendum: Referendum }>();

type Props = {
  member: Member;
};

export const PromotionWidget = memo(({ member }: Props) => {
  useGate(fellowshipPromotion.flow, member);

  const { t } = useI18n();
  const state = useUnit(fellowshipPromotion.$widgetState);
  const { fromDateFormatted, toDateFormatted, promotionPeriod, timelineValue } = usePromotionData();

  const timelineSteps = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.promotionPeriodTooltip', {
          from: fromDateFormatted,
          to: toDateFormatted,
        }),
        length: 8,
      },
      {
        baseColorClass: cnTw('bg-badge-green-background'),
        filledColorClass: cnTw('bg-text-positive'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.submitEvidenceTooltip', { to: toDateFormatted }),
        length: 2,
      },
    ],
    [t, fromDateFormatted, toDateFormatted],
  );

  if (!member) return null;

  if (state === WidgetState.WAITING_OPPORTUNITY) {
    return (
      <WidgetContainer
        title={t('fellowship.promotion.waiting.title')}
        description={t('fellowship.promotion.waiting.description', { from: fromDateFormatted })}
        footer={
          promotionPeriod && (
            <>
              <TimerToBlock endBlock={promotionPeriod.to} shortDateFormat />
              <FootnoteText className="text-text-primary">
                {t('fellowship.promotion.waiting.untilOpportunity')}
              </FootnoteText>
            </>
          )
        }
      >
        <TimelineWithRanks currentRank={member.rank} steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === WidgetState.EVIDENCE_CAN_BE_SUBMITTED) {
    return (
      <WidgetContainer
        title={t('fellowship.promotion.canSubmit.title')}
        description={t('fellowship.promotion.canSubmit.description')}
        footer={
          <>
            <Icon name="clock" size={16} className="mr-1 text-chip-icon" />
            <FootnoteText>{t('fellowship.promotion.canSubmit.submitAnytime')}</FootnoteText>
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.promotion.canSubmit.submitButton')}
            </Button>
          </>
        }
      >
        <TimelineWithRanks currentRank={member.rank} steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === WidgetState.EVIDENCE_SUBMITTED) {
    return <EvidenceSubmitted />;
  }

  if (state === WidgetState.REFERENDUM_CREATED) {
    return <ReferendumCreated />;
  }

  return null;
});

export const EvidenceSubmitted = memo(() => {
  const { t } = useI18n();

  const member = useUnit(fellowshipPromotion.$member);

  const { fromDateFormatted, toDateFormatted, promotionPeriodDates, timelineValue } = usePromotionData();
  const promotionEvidenceSubmissionDate = useUnit(fellowshipPromotion.$promotionEvidenceSubmissionDate);

  const submissionDateFormatted = promotionEvidenceSubmissionDate
    ? formatDate(promotionEvidenceSubmissionDate, 'dd.MM.yy')
    : '';

  const timelineSteps = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.promotionPeriodTooltip', {
          from: fromDateFormatted,
          to: toDateFormatted,
        }),
        length: 10,
      },
    ],
    [t, fromDateFormatted, toDateFormatted],
  );

  const evidenceSubmissionPosition = useMemo(() => {
    if (!promotionEvidenceSubmissionDate) return 50;

    const submissionTime = new Date(promotionEvidenceSubmissionDate).getTime();
    const fromTime = promotionPeriodDates.from.getTime();
    const toTime = promotionPeriodDates.to.getTime();
    const position = ((submissionTime - fromTime) / (toTime - fromTime)) * 100;

    return Math.max(10, Math.min(90, position));
  }, [promotionEvidenceSubmissionDate, promotionPeriodDates]);

  if (!member) return null;

  return (
    <WidgetContainer
      title={t('fellowship.promotion.submitted.title')}
      description={t('fellowship.promotion.submitted.description')}
      footer={
        <>
          <Icon name="clock" size={16} className="mr-1 text-chip-icon" />
          <FootnoteText>{t('fellowship.promotion.submitted.ensureAwareness')}</FootnoteText>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => {}}>
              {t('fellowship.promotion.submitted.viewButton')}
            </Button>
            <Button size="sm" pallet="secondary" variant="fill" onClick={() => {}}>
              {t('fellowship.promotion.submitted.editButton')}
            </Button>
          </div>
        </>
      }
    >
      <TimelineWithRanks
        currentRank={member.rank}
        steps={timelineSteps}
        value={timelineValue}
        submissionPosition={evidenceSubmissionPosition}
        submissionDate={submissionDateFormatted}
      />
    </WidgetContainer>
  );
});

const ReferendumCreated = memo(() => {
  const { t } = useI18n();

  const referendum = useUnit(fellowshipPromotion.$promotionReferendum);
  const votes = useUnit(votesModel.$votesList);
  const pending = useUnit(votesModel.$pending);

  const votingRating = useMemo(() => votingHistoryService.getApprovalRating(votes), [votes]);
  const nobodyVoted = nullable(votingRating);

  const { levelTextKey, levelClassName } = useMemo(() => {
    if (votingRating === 'NotGood') {
      return { levelTextKey: 'fellowship.votingHistory.level.notGood', levelClassName: 'text-text-negative' };
    }
    if (votingRating === 'Controversial') {
      return { levelTextKey: 'fellowship.votingHistory.level.controversial', levelClassName: 'text-text-warning' };
    }
    return { levelTextKey: 'fellowship.votingHistory.level.good', levelClassName: 'text-text-positive' };
  }, [votingRating]);

  const title = nobodyVoted
    ? t('fellowship.votingHistory.noVotes')
    : t('fellowship.votingHistory.subtitlePromotionRetention');

  const voteLevel =
    !nobodyVoted &&
    (pending ? <Skeleton width={12} height="1lh" /> : <span className={levelClassName}>{t(levelTextKey)}</span>);

  if (!referendum) return null;

  return (
    <WidgetContainer
      title={t('fellowship.promotion.referendumCreated.title')}
      footer={
        <>
          <TimerToBlock endBlock={referendum.ends} shortDateFormat />
          <FootnoteText className="text-text-primary">
            {t('fellowship.promotion.referendumCreated.description')}
          </FootnoteText>
          <Slot id={referendumWidgetActionSlot} props={{ referendum }} />
        </>
      }
    >
      <FootnoteText>
        {title} {voteLevel}
      </FootnoteText>
    </WidgetContainer>
  );
});

const usePromotionData = () => {
  const promotionPeriodDates = useUnit(fellowshipPromotion.$promotionPeriodDates);
  const promotionPeriod = useUnit(fellowshipPromotion.$promotionPeriod);
  const currentBlock = useUnit(fellowshipPromotion.$currentBlock);

  const fromDateFormatted = formatDate(promotionPeriodDates.from, 'dd.MM.yy');
  const toDateFormatted = formatDate(promotionPeriodDates.to, 'dd.MM.yy');

  const timelineValue = useMemo(
    () =>
      promotionPeriod && currentBlock
        ? (10 * (currentBlock - promotionPeriod.from)) / (promotionPeriod.to - promotionPeriod.from)
        : 0,
    [promotionPeriod, currentBlock],
  );

  return {
    promotionPeriod,
    currentBlock,
    fromDateFormatted,
    toDateFormatted,
    promotionPeriodDates,
    timelineValue,
  };
};

type WidgetContainerProps = PropsWithChildren<{
  title: string;
  footer: ReactNode;
  description?: string;
}>;

const WidgetContainer = ({ title, description, children, footer }: WidgetContainerProps) => (
  <div className="rounded-lg bg-block-background-default p-4">
    <Box gap={4}>
      <Box gap={3}>
        <Box gap={1}>
          <Box direction="row" gap={2} verticalAlign="center">
            <TitleText className="text-medium-title font-extrabold text-text-primary">{title}</TitleText>
          </Box>
          {description && <FootnoteText className="text-text-primary">{description}</FootnoteText>}
        </Box>
        {children}
      </Box>
      {footer && (
        <Box width="100%" direction="row" verticalAlign="center">
          {footer}
        </Box>
      )}
    </Box>
  </div>
);
