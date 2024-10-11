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
};

export const VoteChart = ({ value, threshold, disabled, thresholdIndicatorBorder = 'icon-button' }: Props) => {
  return (
    <div className="relative flex h-5.5 w-full items-center justify-between gap-x-1">
      {disabled && <div className="h-2.5 w-full rounded-md bg-tab-icon-inactive" />}
      {!disabled && (
        <>
          {value !== 0 ? (
            <div
              className="h-2.5 rounded-md bg-icon-positive"
              style={{
                width: `calc(${value}% - 2px)`,
              }}
            />
          ) : null}

          {value !== 100 ? <div className="h-2.5 grow rounded-md bg-icon-negative" /> : null}
        </>
      )}
      {nonNullable(threshold) ? (
        <div
          className={cnTw(
            'absolute flex h-4 w-1.5 translate-x-[-50%] items-center justify-center rounded-md bg-border-dark',
            'after:contest-[""] after:block after:h-full after:w-0.5 after:rounded-sm after:bg-border-dark',
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
