import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { HelpText, Icon } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Timeline, type TimelineStep, Tooltip } from '@/shared/ui-kit';

type TimelineWithRanksProps = {
  currentRank: number;
  steps: TimelineStep[];
  value: number;
  submissionPosition?: number;
  submissionDate?: string;
};

export const TimelineWithRanks = ({
  currentRank,
  steps,
  value,
  submissionPosition,
  submissionDate,
}: TimelineWithRanksProps) => {
  const { t } = useI18n();

  return (
    <div className="relative">
      <Timeline steps={steps} value={value} />
      <span className="absolute -top-1.5 left-0 z-10 bg-white pr-0.5">
        <CollectiveRank rank={currentRank} />
      </span>
      {nonNullable(submissionPosition) && nonNullable(submissionDate) && (
        <Tooltip side="top" sideOffset={2} enableHover>
          <Tooltip.Trigger>
            <div
              className="absolute -top-1.5 z-10 -translate-x-1/2 rounded-full bg-white p-0.5"
              style={{ left: `${submissionPosition}%` }}
            >
              <Icon name="checkmarkOutline" size={16} className="text-text-positive" />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <HelpText className="px-2 py-1 text-center whitespace-pre-line text-white">
              {t('fellowship.promotion.submitted.submittedOnTooltip', { date: submissionDate })}
            </HelpText>
          </Tooltip.Content>
        </Tooltip>
      )}
      <span className="absolute -top-1.5 right-0 z-10 bg-white pl-0.5">
        <CollectiveRank rank={currentRank + 1} />
      </span>
    </div>
  );
};
