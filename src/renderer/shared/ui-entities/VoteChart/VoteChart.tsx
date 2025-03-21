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

export const VoteChart = ({
  value,
  threshold,
  disabled,
  showDivider = true,
  thresholdIndicatorBorder = 'icon-button',
}: Props) => {
  return (
    <div className="relative flex h-5.5 w-full items-center justify-between">
      {disabled && <div className="h-2.5 w-full rounded-md bg-tab-icon-inactive" />}
      {!disabled &&
        (threshold && !showDivider ? (
          <div className="relative flex h-1.5 w-full overflow-hidden rounded-md">
            {value !== 0 && (
              <div
                className="bg-icon-positive"
                style={{
                  width: `${Math.min(value, threshold)}%`,
                }}
              />
            )}

            {value !== threshold && (
              <div
                className={value > threshold ? 'bg-badge-dark-green-background' : 'bg-badge-dark-red-background'}
                style={{ width: `calc(${Math.abs(value - threshold)}%)` }}
              />
            )}

            {value !== 100 && <div className="grow bg-icon-negative" />}
          </div>
        ) : (
          <div className="flex w-full gap-x-1">
            {value !== 0 && (
              <div
                className="h-2.5 rounded-md bg-icon-positive"
                style={{
                  width: `calc(${value}% - 2px)`,
                }}
              />
            )}

            {value !== 100 && <div className="h-2.5 grow rounded-md bg-icon-negative" />}
          </div>
        ))}

      {nonNullable(threshold) ? (
        <div
          className={cnTw(
            'absolute flex h-4 w-[1px] translate-x-[-50%] items-center justify-center rounded-md',
            showDivider &&
              'after:contest-[""] w-1.5 bg-border-dark after:block after:h-full after:w-0.5 after:rounded-sm after:bg-border-dark',
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
