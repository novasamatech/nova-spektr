import { memo } from 'react';

import { HelpText } from '@/shared/ui/Typography';
import { Tooltip } from '../Tooltip/Tooltip';

export type TimelineStep = {
  baseColorClass: string;
  filledColorClass: string;
  onHoverTooltipText: string;
  length: number;
};

type Props = {
  steps: TimelineStep[];
  value: number;
  testId?: string;
};

const animationDuration = 300;

export const Timeline = memo(({ steps, value: actualLength, testId = 'Timeline' }: Props) => {
  const totalLength = steps.reduce((sum, step) => sum + step.length, 0);

  let accumulatedLength = 0;

  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden" data-testid={testId}>
      {steps.map((step, index) => {
        const stepStart = accumulatedLength;
        const stepEnd = accumulatedLength + step.length;
        accumulatedLength = stepEnd;

        const isFilled = actualLength >= stepEnd;
        const isPartiallyFilled = actualLength > stepStart && actualLength < stepEnd;

        const fillPercentage = isPartiallyFilled
          ? ((actualLength - stepStart) / step.length) * 100
          : isFilled
            ? 100
            : 0;

        const widthPercentage = (step.length / totalLength) * 100;
        const transitionDelay = index * animationDuration;

        return (
          <Tooltip key={index} side="top" sideOffset={2}>
            <Tooltip.Trigger>
              <div
                className={`relative h-full overflow-hidden rounded-sm transition-all ${step.baseColorClass}`}
                style={{ width: `${widthPercentage}%` }}
              >
                <div
                  className={`absolute inset-0 transition-all duration-300 ${step.filledColorClass}`}
                  style={{
                    width: `${fillPercentage}%`,
                    transitionDelay: `${transitionDelay}ms`,
                  }}
                />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <HelpText className="px-2 py-1 text-center whitespace-pre-line text-white">
                {step.onHoverTooltipText}
              </HelpText>
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
});
