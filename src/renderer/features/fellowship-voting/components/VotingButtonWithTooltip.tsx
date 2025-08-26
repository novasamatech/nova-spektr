import { type MouseEventHandler, type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui/types';
import { FilledIconButton, Tooltip } from '@/shared/ui-kit';
import { categorizeImpact } from '../utils';

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
  ({
    isVoted,
    checked,
    disabled,
    votes,
    variant,
    voteImpact,
    onClick,
    onHighlight = () => {},
    icon,
    children,
    fullWidth,
  }: Props) => {
    const { t } = useI18n();

    const buttonNode = (
      <FilledIconButton
        checked={checked || isVoted}
        marked={checked || isVoted}
        disabled={disabled}
        icon={icon}
        variant={variant}
        fullWidth={fullWidth}
        onClick={onClick}
        onMouseOver={() => onHighlight(variant === 'positive' ? 'Aye' : 'Nay')}
        onMouseLeave={() => onHighlight(null)}
      >
        {children}
      </FilledIconButton>
    );

    if (checked || isVoted || disabled || nullable(votes) || nullable(voteImpact)) return buttonNode;

    const tooltipText = variant === 'positive' ? t('voteChart.good') : t('voteChart.notGood');
    const impact = categorizeImpact(voteImpact);

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className={cnTw({ 'w-full': fullWidth })}>{buttonNode}</div>
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
