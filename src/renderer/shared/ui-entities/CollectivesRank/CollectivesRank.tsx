import { type ComponentProps } from 'react';

import { Label } from '@/shared/ui-kit';

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

type Props = {
  rank: number;
};

export const CollectivesRank = ({ rank }: Props) => {
  return <Label variant={pickRankColor(rank)}>{rank.toString()}</Label>;
};
