import { formatDate } from 'date-fns';
import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, type ReactNode, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, TitleText } from '@/shared/ui';
import { Box, Skeleton, type TimelineStep } from '@/shared/ui-kit';
import { type Member, type Referendum, votingHistoryService } from '@/domains/collectives';
import { RetentionWidgetState, fellowshipRetention } from '../models/retention';
import { votesModel } from '../models/votes';

import { RetentionTimeline } from './RetentionTimeline';
import { TimerToBlock } from './TimerToBlock';

const SAFE_ZONE_LENGTH = 292;
const WARNING_ZONE_LENGTH = 64;
const DANGER_ZONE_LENGTH = 16;
const TOTAL_LENGTH = SAFE_ZONE_LENGTH + WARNING_ZONE_LENGTH + DANGER_ZONE_LENGTH;

export const referendumWidgetActionSlot = createSlot<{ referendum: Referendum }>();

type Props = {
  member: Member;
};

export const RetentionWidget = memo(({ member }: Props) => {
  useGate(fellowshipRetention.flow, member);

  const { t } = useI18n();
  const state = useUnit(fellowshipRetention.$widgetState);
  const { fromDateFormatted, toDateFormatted, retentionPeriod, timelineSteps, timelineValue } = useRetentionData();

  if (!member) return null;

  if (state === RetentionWidgetState.WAITING) {
    return (
      <WidgetContainer
        title={t('fellowship.retention.normal.title')}
        description={t('fellowship.retention.normal.description', {
          from: fromDateFormatted,
          to: toDateFormatted,
        })}
        footer={
          retentionPeriod && (
            <>
              <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat />
              <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
            </>
          )
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.WARNING_APPROACHING) {
    return (
      <WidgetContainer
        title={t('fellowship.retention.normal.title')}
        description={t('fellowship.retention.normal.description', {
          from: fromDateFormatted,
          to: toDateFormatted,
        })}
        footer={
          retentionPeriod && (
            <>
              <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat />
              <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
              <Button size="sm" className="ml-auto" onClick={() => {}}>
                {t('fellowship.retention.button.submitReport')}
              </Button>
            </>
          )
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.WARNING_URGENT) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.warningUrgent.title')}
        description={t('fellowship.retention.warningUrgent.description', { to: toDateFormatted })}
        footer={
          retentionPeriod && (
            <>
              <Icon name="clock" size={16} className="text-chip-icon" />
              <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
              <Button size="sm" className="ml-auto" onClick={() => {}}>
                {t('fellowship.retention.button.submitReport')}
              </Button>
            </>
          )
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.CRITICAL_LAST_CALL) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.criticalLastCall.title')}
        description={t('fellowship.retention.criticalLastCall.description', { to: toDateFormatted })}
        footer={
          retentionPeriod && (
            <>
              <Icon name="fire" size={16} className="text-badge-red-background" />
              <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
              <Button size="sm" className="ml-auto" onClick={() => {}}>
                {t('fellowship.retention.button.submitReport')}
              </Button>
            </>
          )
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.CRITICAL_EXPIRED) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.criticalExpired.title')}
        description={t('fellowship.retention.criticalExpired.description')}
        footer={
          <>
            <Icon name="fire" size={16} className="text-badge-red-background" />
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.riskBumped')}</FootnoteText>
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.retention.button.submitReport')}
            </Button>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.REPORT_SUBMITTED) {
    return <ReportSubmitted />;
  }

  if (state === RetentionWidgetState.REFERENDUM_CREATED) {
    return <ReferendumCreated />;
  }

  return null;
});

const ReportSubmitted = memo(() => {
  const { t } = useI18n();

  const member = useUnit(fellowshipRetention.$member);
  const { retentionPeriodDates, submittedTimelineSteps, submittedTimelineValue } = useRetentionData();
  const retentionEvidenceSubmissionDate = useUnit(fellowshipRetention.$retentionEvidenceSubmissionDate);

  const submissionPosition = useMemo(() => {
    if (!retentionEvidenceSubmissionDate) return 50;

    const submissionTime = new Date(retentionEvidenceSubmissionDate).getTime();
    const fromTime = retentionPeriodDates.from.getTime();
    const toTime = retentionPeriodDates.to.getTime();
    const position = ((submissionTime - fromTime) / (toTime - fromTime)) * 100;

    return Math.max(10, Math.min(90, position));
  }, [retentionEvidenceSubmissionDate, retentionPeriodDates]);

  const submissionTooltip = useMemo(() => {
    if (!retentionEvidenceSubmissionDate) return undefined;
    const date = formatDate(new Date(retentionEvidenceSubmissionDate), 'dd.MM.yy');
    return t('fellowship.retention.timeline.submittedOn', { date });
  }, [retentionEvidenceSubmissionDate, t]);

  if (!member) return null;

  return (
    <WidgetContainer
      icon={<Icon name="checkmarkOutline" size={16} className="text-text-positive" />}
      title={t('fellowship.retention.submitted.title')}
      description={t('fellowship.retention.submitted.description')}
      footer={
        <>
          <Icon name="clock" size={16} className="mr-1 text-chip-icon" />
          <FootnoteText>{t('fellowship.retention.timer.ensureAwareness')}</FootnoteText>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => {}}>
              {t('fellowship.retention.button.view')}
            </Button>
            <Button size="sm" pallet="secondary" variant="fill" onClick={() => {}}>
              {t('fellowship.retention.button.edit')}
            </Button>
          </div>
        </>
      }
    >
      <RetentionTimeline
        steps={submittedTimelineSteps}
        value={submittedTimelineValue}
        submissionPosition={submissionPosition}
        submissionTooltip={submissionTooltip}
      />
    </WidgetContainer>
  );
});

const ReferendumCreated = memo(() => {
  const { t } = useI18n();

  const referendum = useUnit(fellowshipRetention.$retentionReferendum);
  const votes = useUnit(votesModel.$votesList);
  const pending = useUnit(votesModel.$pending);

  const votingRating = useMemo(() => {
    return votingHistoryService.getApprovalRating(votes);
  }, [votes]);
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
      title={t('fellowship.retention.referendumCreated.title')}
      footer={
        <>
          <TimerToBlock endBlock={referendum.ends} shortDateFormat />
          <FootnoteText className="text-text-primary">
            {t('fellowship.retention.referendumCreated.description')}
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

const useRetentionData = () => {
  const { t } = useI18n();
  const retentionPeriodDates = useUnit(fellowshipRetention.$retentionPeriodDates);
  const retentionPeriod = useUnit(fellowshipRetention.$retentionPeriod);
  const currentBlock = useUnit(fellowshipRetention.$currentBlock);
  const leftToEnd = useUnit(fellowshipRetention.$leftToEndOfPeriod);

  const fromDateFormatted = formatDate(retentionPeriodDates.from, 'dd.MM.yy');
  const toDateFormatted = formatDate(retentionPeriodDates.to, 'dd.MM.yy');

  // Timeline steps for active retention period (3 zones: safe, warning, danger)
  const timelineSteps: TimelineStep[] = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.retention.timeline.safeZone'),
        length: SAFE_ZONE_LENGTH,
      },
      {
        baseColorClass: cnTw('bg-badge-orange-background-default'),
        filledColorClass: cnTw('bg-icon-warning'),
        onHoverTooltipText: t('fellowship.retention.timeline.warningZone'),
        length: WARNING_ZONE_LENGTH,
      },
      {
        baseColorClass: cnTw('bg-badge-red-background'),
        filledColorClass: cnTw('bg-icon-negative'),
        onHoverTooltipText: t('fellowship.retention.timeline.dangerZone'),
        length: DANGER_ZONE_LENGTH,
      },
    ],
    [t],
  );

  // Timeline steps for submitted report (single safe zone)
  const submittedTimelineSteps: TimelineStep[] = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-accent-background'),
        filledColorClass: cnTw('bg-icon-blue-line'),
        onHoverTooltipText: t('fellowship.retention.timeline.safeZone'),
        length: TOTAL_LENGTH,
      },
    ],
    [t],
  );

  // Calculate timeline progress based on current block position
  const timelineProgress = useMemo(() => {
    if (!retentionPeriod || !currentBlock || !leftToEnd) {
      return { safe: 0, warning: 0, danger: 0 };
    }

    const totalBlocks = retentionPeriod.to - retentionPeriod.from;
    const elapsed = currentBlock - retentionPeriod.from;

    const DANGER_BLOCKS = 2880; // ~2 days
    const WARNING_BLOCKS = 20160; // ~2 weeks
    const SAFE_BLOCKS = totalBlocks - WARNING_BLOCKS - DANGER_BLOCKS;

    if (leftToEnd <= 0) {
      return { safe: 100, warning: 100, danger: 100 };
    }

    if (leftToEnd <= DANGER_BLOCKS) {
      const dangerProgress = ((DANGER_BLOCKS - leftToEnd) / DANGER_BLOCKS) * 100;
      return { safe: 100, warning: 100, danger: dangerProgress };
    }

    if (leftToEnd <= WARNING_BLOCKS) {
      const warningProgress = ((WARNING_BLOCKS - leftToEnd) / WARNING_BLOCKS) * 100;
      return { safe: 100, warning: warningProgress, danger: 0 };
    }

    const safeProgress = (elapsed / SAFE_BLOCKS) * 100;
    return { safe: Math.min(safeProgress, 100), warning: 0, danger: 0 };
  }, [retentionPeriod, currentBlock, leftToEnd]);

  // Convert progress percentages to timeline value
  const timelineValue = useMemo(() => {
    const safeValue = (timelineProgress.safe / 100) * SAFE_ZONE_LENGTH;
    const warningValue = (timelineProgress.warning / 100) * WARNING_ZONE_LENGTH;
    const dangerValue = (timelineProgress.danger / 100) * DANGER_ZONE_LENGTH;

    return safeValue + warningValue + dangerValue;
  }, [timelineProgress]);

  // Timeline value for submitted report
  const submittedTimelineValue = useMemo(() => {
    return (timelineProgress.safe / 100) * TOTAL_LENGTH;
  }, [timelineProgress.safe]);

  return {
    retentionPeriod,
    currentBlock,
    fromDateFormatted,
    toDateFormatted,
    retentionPeriodDates,
    timelineSteps,
    timelineValue,
    submittedTimelineSteps,
    submittedTimelineValue,
  };
};

type WidgetContainerProps = PropsWithChildren<{
  title: string;
  footer: ReactNode;
  description?: string;
  icon?: ReactNode;
}>;

const WidgetContainer = ({ title, description, icon, children, footer }: WidgetContainerProps) => (
  <div className="rounded-lg bg-block-background-default p-4">
    <Box gap={4}>
      <Box gap={3}>
        <Box gap={1}>
          <Box direction="row" gap={2} verticalAlign="center">
            {icon}
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
