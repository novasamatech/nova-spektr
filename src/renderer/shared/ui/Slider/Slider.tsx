import * as RadixSlider from '@radix-ui/react-slider';
import { type ReactNode, forwardRef } from 'react';

import { cnTw } from '@shared/lib/utils';

import { StepIndicators } from './StepIndicators';
import { StepLabels } from './StepLabels';
import { countSteps } from './helpers';

type RageValue = [start: number, end: number];

type SimpleProps = {
  range?: never;
  value: number;
  onChange: (value: number) => unknown;
};

type RangeProps = {
  range: true;
  value: RageValue;
  onChange: (value: RageValue) => void;
};

type Props = (SimpleProps | RangeProps) & {
  renderLabel?: (value: number, index: number) => ReactNode;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
};

export const Slider = forwardRef<HTMLSpanElement, Props>(
  ({ value, min = 0, max = 10, disabled, range, renderLabel, step: stepSize, onChange }, ref) => {
    const fixedValue = range ? value : [value];

    const handleChange = (value: RageValue) => {
      if (range) {
        onChange(value);
      } else {
        onChange(value.at(0) ?? 0);
      }
    };

    const isStartFilled = range ? value[0] === min : true;
    const isEndFilled = range ? value[1] === max : value === max;

    const totalSteps = countSteps(min, max, stepSize ?? 1);

    return (
      <div className="flex flex-col w-full gap-2">
        <StepLabels min={min} stepSize={stepSize} steps={totalSteps} renderLabel={renderLabel} />

        <div className="flex items-center relative w-full h-4">
          <div
            className={cnTw(
              'h-2 w-2 rounded-s',
              isStartFilled ? 'bg-primary-button-background-default' : 'bg-icon-blue-line',
            )}
          />

          <RadixSlider.Root
            ref={ref}
            className="flex items-center relative w-full h-full"
            value={fixedValue}
            step={stepSize}
            min={min}
            max={max}
            minStepsBetweenThumbs={1}
            onValueChange={handleChange}
          >
            <RadixSlider.Track className={cnTw('block relative w-full h-2 bg-icon-blue-line')}>
              <RadixSlider.Range className="block absolute ps-2 h-full bg-primary-button-background-default" />
            </RadixSlider.Track>

            <StepIndicators steps={totalSteps} />

            {fixedValue.map((_, i) => (
              <RadixSlider.Thumb
                key={i}
                className={cnTw(
                  'block relative w-5 h-5 border-2 rounded-full border-white-button-background-default',
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
