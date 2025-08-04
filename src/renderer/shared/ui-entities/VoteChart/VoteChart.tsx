import { cnTw, nonNullable } from '@/shared/lib/utils';

type Props = {
  /**
   * Value in range of 0..100
   */
  value: number;
  /**
   * Value in range of 0..100
   */
  threshold?: number;
  disabled?: boolean;
  thresholdIndicatorBorder?: string;
  showDivider?: boolean;
};

export const VoteChart = ({ value, threshold, disabled, thresholdIndicatorBorder = 'icon-button' }: Props) => {
  return (
    <div className="relative flex h-5.5 w-full items-center justify-between gap-x-1">
      {disabled && <div className="bg-tab-icon-inactive h-2.5 w-full rounded-md" />}
      {!disabled && (
        <>
          {value !== 0 ? (
            <div
              className="bg-icon-positive h-2.5 rounded-md"
              style={{
                width: `calc(${value}% - 2px)`,
              }}
            />
          ) : null}

          {value !== 100 ? <div className="bg-icon-negative h-2.5 grow rounded-md" /> : null}
        </>
      )}

      {nonNullable(threshold) ? (
        <div
          className={cnTw(
            'bg-border-dark absolute flex h-4 w-1.5 translate-x-[-50%] items-center justify-center rounded-md',
            'after:contest-[""] after:bg-border-dark after:block after:h-full after:w-0.5 after:rounded-xs',
          )}
          style={{
            backgroundColor: `var(--${thresholdIndicatorBorder})`,
            left: `clamp(3px, ${threshold}%, calc(100% - 3px))`,
          }}
        />
      ) : null}
    </div>
  );
};
