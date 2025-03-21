type Props = {
  /**
   * Value in range of 0..100
   */
  value: number;
  /**
   * Value in range of 0..100
   */
  disabled?: boolean;
  votesImpact?: number;
};

export const DynamicVoteChart = ({ value, disabled, votesImpact = 0 }: Props) => {
  return (
    <div className="relative flex h-3.5 w-full items-center justify-between">
      {disabled && <div className="h-1.5 w-full rounded-md bg-tab-icon-inactive" />}
      {!disabled && (
        <div className="relative flex h-1.5 w-full overflow-hidden rounded-md">
          {value !== 0 && (
            <div
              className="bg-icon-positive"
              style={{
                width: `${Math.min(value, value + votesImpact)}%`,
              }}
            />
          )}

          {value !== 0 && value !== 100 && (
            <div
              className="absolute flex h-2 w-[1px] items-center justify-center rounded-md bg-icon-button"
              style={{
                left: `${value}%`,
              }}
            />
          )}

          {!!votesImpact && (
            <div
              className={votesImpact > 0 ? 'bg-badge-dark-green-background' : 'bg-badge-dark-red-background'}
              style={{ width: `${Math.abs(votesImpact)}%` }}
            />
          )}

          {value !== 100 && <div className="grow bg-icon-negative" />}
        </div>
      )}
    </div>
  );
};
