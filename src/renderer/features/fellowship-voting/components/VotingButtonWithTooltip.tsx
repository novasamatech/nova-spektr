import { type MouseEventHandler } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';
import { Tooltip } from '@/shared/ui-kit';

type Props = {
  variant: 'positive' | 'negative';
  icon: IconNames;
  voted?: boolean;
  checked?: boolean;
  disabled?: boolean;
  votes?: number | null;
  voteImpact?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onHighlight: (arg: 'aye' | 'nay' | null) => void;
};

function categorizeImpact(voteImpact: number): string {
  if (voteImpact >= 60) {
    return 'huge';
  } else if (voteImpact <= 20) {
    return 'minor';
  }
  return 'moderate';
}

export const VotingButtonWithTooltip = (args: Props) => {
  const { t } = useI18n();

  const { voted, checked, disabled, votes, variant, voteImpact } = args;

  if (checked || voted || disabled || nullable(votes) || nullable(voteImpact)) return <FilledIconButton {...args} />;

  const tooltipText = variant === 'positive' ? t('voteChart.aye') : t('voteChart.nay');
  const impact = categorizeImpact(voteImpact);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <FilledIconButton {...args} />
        </div>
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
};

const FilledIconButton = ({ variant, disabled, checked, icon, voted, onClick, onHighlight }: Props) => {
  const vote = variant === 'positive' ? 'aye' : 'nay';

  if (checked) {
    onHighlight(vote);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cnTw(
        'flex appearance-none flex-col items-center gap-2 rounded-lg px-4 py-3',
        'disabled:pointer-events-none disabled:bg-secondary-button-background',
        { 'opacity-30': !voted && !checked },
        {
          'pointer-events-none': voted || checked,
          'bg-badge-green-background text-text-positive hover:opacity-90 active:opacity-100': variant === 'positive',
          'bg-badge-red-background text-text-negative hover:opacity-90 active:opacity-100': variant === 'negative',
        },
      )}
      onClick={onClick}
      onMouseOver={() => onHighlight(vote)}
      onMouseLeave={() => onHighlight(null)}
    >
      {checked && (
        <div
          className={cnTw('absolute top-1 h-1.5 w-1.5 rounded-full', {
            'right-2 bg-icon-positive': variant === 'positive',
            'left-1 bg-icon-negative': variant === 'negative',
          })}
        />
      )}
      <Icon
        name={icon}
        size={16}
        className={cnTw({
          'text-icon-positive': variant === 'positive' && !disabled,
          'text-icon-negative': variant === 'negative' && !disabled,
        })}
      />
    </button>
  );
};
