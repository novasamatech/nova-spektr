import { type MouseEventHandler, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
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

type Props = {
  variant: 'positive' | 'negative';
  icon: IconNames;
  isVoted?: boolean;
  checked?: boolean;
  disabled?: boolean;
  votes?: number | null;
  voteImpact?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onHighlight: (arg: 'Aye' | 'Nay' | null) => void;
};

export const VotingButtonWithTooltip = memo(
  ({ isVoted, checked, disabled, votes, variant, voteImpact, onClick, onHighlight, icon }: Props) => {
    const { t } = useI18n();

    const buttonNode = (
      <FilledIconButton
        checked={checked || isVoted}
        marked={checked && !isVoted}
        disabled={disabled}
        icon={icon}
        variant={variant}
        onClick={onClick}
        onMouseOver={() => onHighlight(variant === 'positive' ? 'Aye' : 'Nay')}
        onMouseLeave={() => onHighlight(null)}
      />
    );

    if (checked || isVoted || disabled || nullable(votes) || nullable(voteImpact)) return buttonNode;

    const tooltipText = variant === 'positive' ? t('voteChart.aye') : t('voteChart.nay');
    const impact = categorizeImpact(voteImpact);

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div>{buttonNode}</div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>
            <span>
              {tooltipText}: {t('fellowship.votingHistory.votes', { count: votes })}
            </span>
            <br />
            <span>
              {t('fellowship.voting.voteImpact.impact')} {t(`fellowship.voting.voteImpact.${impact}`)}
            </span>
          </p>
        </Tooltip.Content>
      </Tooltip>
    );
  },
);
