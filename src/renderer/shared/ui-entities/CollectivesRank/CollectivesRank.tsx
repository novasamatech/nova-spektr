import { type ComponentProps, type PropsWithChildren, memo } from 'react';

import { Box, Label } from '@/shared/ui-kit';

const romanNumbersLookup = [
  ['M', 1000],
  ['CM', 900],
  ['D', 500],
  ['CD', 400],
  ['C', 100],
  ['XC', 90],
  ['L', 50],
  ['XL', 40],
  ['X', 10],
  ['IX', 9],
  ['V', 5],
  ['IV', 4],
  ['I', 1],
] as const;

const toRomanNumeral = (num: number) => {
  return romanNumbersLookup.reduce((acc, [k, v]) => {
    acc += k.repeat(Math.floor(num / v));
    num = num % v;

    return acc;
  }, '');
};

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

export const CollectivesRank = memo(({ rank, children }: Props) => {
  return (
    <Label variant={pickRankColor(rank)}>
      <Box direction="row">
        <span>{rank ? toRomanNumeral(rank) : '0'}</span>
        {children ? <>&nbsp;{children}</> : null}
      </Box>
    </Label>
  );
});
