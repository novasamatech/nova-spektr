import * as RadixSlider from '@radix-ui/react-slider';
import { type ReactNode, forwardRef } from 'react';

import { cnTw } from '@shared/lib/utils';

import { StepIndicators } from './StepIndicators';
import { StepLabels } from './StepLabels';
import { countSteps } from './helpers';

type RangeValue = [start: number, end: number];

type SimpleProps = {
  range?: never;
  value: number;
  onChange: (value: number) => unknown;
};

type RangeProps = {
  range: true;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
};

type Props = (SimpleProps | RangeProps) & {
  /**
   * Render function for labels, placed on top of each step. `value` and `index`
   * may differ, if `step` prop is not equal 1.
   */
  renderLabel?: (value: number, index: number) => ReactNode;
  /**
   * Step size between values. e.g.
   *
   * ```
   * min = 0
   * max = 6
   * step = 2
   * possible values = 0, 2, 4, 6
   * ```
   *
   * @default 1
   */
  step?: number;
  /**
   * @default 0
   */
  min?: number;
  /**
   * @default 10
   */
  max?: number;
  disabled?: boolean;
};

export const Slider = forwardRef<HTMLSpanElement, Props>(
  ({ value, min = 0, max = 10, disabled, range, renderLabel, step: stepSize = 1, onChange }, ref) => {
    const fixedValue = range ? value : [value];

    const handleChange = (value: RangeValue) => {
      if (range) {
        onChange(value);
      } else {
        onChange(value.at(0) ?? 0);
      }
    };

    const isStartFilled = range ? value.at(0) === min : true;
    const isEndFilled = range ? value.at(1) === max : value === max;

    const totalSteps = countSteps(min, max, stepSize);

    return (
      <div className="flex w-full flex-col gap-2">
        <StepLabels min={min} stepSize={stepSize} steps={totalSteps} renderLabel={renderLabel} />

        <div className="relative flex h-4 w-full items-center">
          <div
            className={cnTw(
              'h-2 w-2 rounded-s',
              isStartFilled ? 'bg-primary-button-background-default' : 'bg-icon-blue-line',
            )}
          />

          <RadixSlider.Root
            ref={ref}
            className="relative flex h-full w-full items-center"
            value={fixedValue}
            step={stepSize}
            min={min}
            max={max}
            disabled={disabled}
            minStepsBetweenThumbs={1}
            onValueChange={handleChange}
          >
            <RadixSlider.Track className={cnTw('relative block h-2 w-full bg-icon-blue-line')}>
              <RadixSlider.Range className="absolute block h-full bg-primary-button-background-default ps-2" />
            </RadixSlider.Track>

            <StepIndicators steps={totalSteps} />

            {fixedValue.map((_, i) => (
              <RadixSlider.Thumb
                key={i}
                className={cnTw(
                  'relative block h-5 w-5 rounded-full border-2 border-white-button-background-default',
                  'bg-primary-button-background-default',
                  'hover:bg-primary-button-background-hover',
                  'active:bg-primary-button-background-active',
                  'focus:ring-2',
                )}
              />
            ))}
          </RadixSlider.Root>

          <div
            className={cnTw(
              'h-2 w-2 rounded-e',
              isEndFilled ? 'bg-primary-button-background-default' : 'bg-icon-blue-line',
            )}
          />
        </div>
      </div>
    );
  },
);
