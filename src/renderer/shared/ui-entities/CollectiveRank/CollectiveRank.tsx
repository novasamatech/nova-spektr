import { type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { TextBase } from '@/shared/ui/Typography';
import { Box } from '@/shared/ui-kit';

type Variant = 'orange' | 'red' | 'purple' | 'lightBlue' | 'green' | 'blue' | 'gray';

const pickRankColor = (rank: number): Variant => {
  const rankVariants: Record<number, Variant> = {
    2: 'orange',
    3: 'red',
    4: 'purple',
    5: 'lightBlue',
    6: 'green',
    7: 'blue',
  };

  return rankVariants[rank] ?? (rank > 7 ? 'blue' : 'gray');
};

export const getRankTitle = (rank: number) => {
  const titles: Record<number, string> = {
    0: 'fellowship.rank.0',
    1: 'fellowship.rank.1',
    2: 'fellowship.rank.2',
    3: 'fellowship.rank.3',
    4: 'fellowship.rank.4',
    5: 'fellowship.rank.5',
    6: 'fellowship.rank.6',
    7: 'fellowship.rank.7',
    8: 'fellowship.rank.8',
    9: 'fellowship.rank.9',
  };

  return titles[rank] ?? '';
};

type Props = {
  rank: number;
  showName?: boolean;
};

export const CollectiveRank = memo(({ rank, showName }: Props) => {
  const { t } = useI18n();

  return (
    <Label variant={pickRankColor(rank)}>
      <Box direction="row" gap={1}>
        <span className="text-text-primary">{nonNullable(rank) ? toRomanNumeral(rank) : null}</span>
        {showName ? (
          <TextBase className="text-text-primary" as="span">
            {t(getRankTitle(rank))}
          </TextBase>
        ) : null}
      </Box>
    </Label>
  );
});

export const Label = ({ variant, children }: PropsWithChildren<{ variant: Variant }>) => {
  return (
    <span
      className={cnTw(
        'flex h-fit w-fit max-w-full shrink-0 truncate rounded-sm px-1 py-1 text-caption uppercase select-none',
        {
          ['bg-badge-red-background-default text-text-negative']: variant === 'red',
          ['bg-badge-orange-background-default text-text-warning']: variant === 'orange',
          ['bg-badge-green-background-default text-text-positive']: variant === 'green',
          ['bg-label-lightblue-default text-text-conviction-slider-text-2']: variant === 'lightBlue',
          ['bg-badge-background text-tab-text-accent']: variant === 'blue',
          ['bg-label-purple-default text-icon-alert']: variant === 'purple',
          ['bg-input-background-disabled text-text-secondary']: variant === 'gray',
        },
      )}
    >
      {children}
    </span>
  );
};
