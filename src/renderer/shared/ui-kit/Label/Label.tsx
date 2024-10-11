import { type PropsWithChildren } from 'react';

import { cnTw } from '../../lib/utils';

type Variant =
  | 'red'
  | 'darkRed'
  | 'orange'
  | 'green'
  | 'darkGreen'
  | 'lightBlue'
  | 'blue'
  | 'purple'
  | 'darkGray'
  | 'gray';

type Props = PropsWithChildren<{
  variant: Variant;
}>;

export const Label = ({ variant, children }: Props) => {
  return (
    <span
      className={cnTw('flex h-fit w-fit max-w-full select-none truncate rounded-2xl px-2 py-1 text-caption uppercase', {
        ['bg-badge-red-background-default text-text-negative']: variant === 'red',
        ['bg-label-background-red text-white']: variant === 'darkRed',
        ['bg-badge-orange-background-default text-text-warning']: variant === 'orange',
        ['bg-badge-green-background-default text-text-positive']: variant === 'green',
        ['bg-label-background-green text-white']: variant === 'darkGreen',
        ['bg-label-lightblue-default text-text-conviction-slider-text-2']: variant === 'lightBlue',
        ['bg-badge-background text-tab-text-accent']: variant === 'blue',
        ['bg-label-purple-default text-icon-alert']: variant === 'purple',
        ['bg-label-background-gray text-white']: variant === 'darkGray',
        ['bg-input-background-disabled text-text-secondary']: variant === 'gray',
      })}
    >
      <span className="truncate">{children}</span>
    </span>
  );
};
