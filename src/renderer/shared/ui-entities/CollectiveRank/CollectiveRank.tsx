import { type ComponentProps, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { TextBase } from '@/shared/ui/Typography';
import { Box, Label } from '@/shared/ui-kit';

const pickRankColor = (rank: number): ComponentProps<typeof Label>['variant'] => {
  const rankVariants: Record<number, ComponentProps<typeof Label>['variant']> = {
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
    <Label variant={pickRankColor(rank)} className="rounded px-1">
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
