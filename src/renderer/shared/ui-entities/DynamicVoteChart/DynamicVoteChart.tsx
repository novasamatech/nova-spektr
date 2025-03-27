type Props = {
  /**
   * Value in range of 0..100
   */
  value: number;
  /**
   * Value in range of 0..100
   */
  votesImpact?: number;
  hasVotes?: boolean;
  disabled?: boolean;
};

export const DynamicVoteChart = ({ value, hasVotes, disabled, votesImpact = 0 }: Props) => {
  return (
    <div className="relative flex h-3.5 w-full items-center justify-between">
      {disabled && <div className="h-1.5 w-full rounded-md bg-tab-icon-inactive" />}
      {!disabled && (
        <div className="relative flex h-1.5 w-full gap-x-1 overflow-hidden rounded-md">
          {value !== 100 && (
            <div className="flex overflow-hidden rounded-md" style={{ width: `${100 - value}%` }}>
              <div
                className={hasVotes || votesImpact ? 'bg-icon-negative' : 'bg-text-secondary'}
                style={{ width: `${Math.min(100, 100 - votesImpact)}%` }}
              />

              {!!votesImpact && votesImpact > 0 && (
                <div className="w-full bg-badge-dark-green-background" style={{ width: `${Math.abs(votesImpact)}%` }} />
              )}
            </div>
          )}

          {value !== 0 && (
            <div className="flex overflow-hidden rounded-md" style={{ width: `${value}%` }}>
              {!!votesImpact && votesImpact <= 0 && (
                <div className="bg-badge-dark-red-background" style={{ width: `${Math.abs(votesImpact)}%` }} />
              )}

              <div className="w-full bg-icon-positive" style={{ width: `${Math.min(100, 100 + votesImpact)}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
