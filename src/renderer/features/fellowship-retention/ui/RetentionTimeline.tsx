import { memo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { HelpText, Icon } from '@/shared/ui';
import { type TimelineStep, Timeline, Tooltip } from '@/shared/ui-kit';

type Props = {
  steps: TimelineStep[];
  value: number;
  submissionPosition?: number;
  submissionTooltip?: string;
};

export const RetentionTimeline = memo(({ steps, value, submissionPosition, submissionTooltip }: Props) => {
  const hasSubmissionMarker = nonNullable(submissionPosition) && nonNullable(submissionTooltip);

  if (hasSubmissionMarker) {
    return (
      <div className="relative w-full">
        <Timeline steps={steps} value={value} />
        <Tooltip side="top" sideOffset={2} enableHover>
          <Tooltip.Trigger>
            <div
              className="absolute -top-1.5 z-10 -translate-x-1/2 rounded-full bg-card-background p-0.5"
              style={{ left: `${submissionPosition}%` }}
            >
              <Icon name="checkmarkOutline" size={16} className="text-text-positive" />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <HelpText className="px-2 py-1 text-center whitespace-pre-line text-white">{submissionTooltip}</HelpText>
          </Tooltip.Content>
        </Tooltip>
      </div>
    );
  }

  return <Timeline steps={steps} value={value} />;
});
