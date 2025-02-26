import { type ComponentProps, type PropsWithChildren, memo } from 'react';

import { toRomanNumeral } from '@/shared/lib/utils';
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

type Props = PropsWithChildren<{
  rank: number;
}>;

export const CollectiveRank = memo(({ rank, children }: Props) => {
  return (
    <Label variant={pickRankColor(rank)}>
      <Box direction="row">
        <span>{rank ? toRomanNumeral(rank) : '0'}</span>
        {children ? <>&nbsp;{children}</> : null}
      </Box>
    </Label>
  );
});
