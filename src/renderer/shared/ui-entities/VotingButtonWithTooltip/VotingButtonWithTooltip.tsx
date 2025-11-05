import { type MouseEventHandler, type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui/types';
import { FilledIconButton, Tooltip } from '@/shared/ui-kit';

function categorizeImpact(voteImpact: number): string {
  if (voteImpact >= 60) {
    return 'huge';
  } else if (voteImpact <= 20) {
    return 'minor';
  }
  return 'moderate';
}

type Props = PropsWithChildren<{
  variant: 'positive' | 'negative';
  icon: IconNames;
  isVoted?: boolean;
  checked?: boolean;
  disabled?: boolean;
  votes?: number | null;
  voteImpact?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onHighlight?: (arg: 'Aye' | 'Nay' | null) => void;
  fullWidth?: boolean;
}>;

export const VotingButtonWithTooltip = memo(
  ({ isVoted, checked, disabled, votes, variant, voteImpact, onClick, icon, children, fullWidth }: Props) => {
    const { t } = useI18n();

    const showTooltip = !checked && !isVoted && !disabled && votes != null && voteImpact != null;

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className={cnTw({ 'w-full': fullWidth })}>
            <FilledIconButton
              checked={checked || isVoted}
              marked={checked || isVoted}
              disabled={disabled}
              icon={icon}
              variant={variant}
              fullWidth={fullWidth}
              onClick={onClick}
            >
              {children}
            </FilledIconButton>
          </div>
        </Tooltip.Trigger>

        {showTooltip ? (
          <Tooltip.Content>
            <p>
              <span>
                {variant === 'positive' ? t('voteChart.good') : t('voteChart.notGood')}:
                {t('fellowship.votingHistory.votes', { count: votes })}
              </span>
              <br />
              <span>
                {t('fellowship.voting.voteImpact.impact')}
                {t(`fellowship.voting.voteImpact.${categorizeImpact(voteImpact)}`)}
              </span>
            </p>
          </Tooltip.Content>
        ) : null}
      </Tooltip>
    );
  },
);
