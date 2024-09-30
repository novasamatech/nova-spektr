import { type ComponentProps } from 'react';

import { type Chain } from '@/shared/core';
import { AccountExplorers, Hash } from '@/shared/ui-entities';
import { Label } from '@/shared/ui-kit';
import { cnTw, toAddress } from '@shared/lib/utils';
import { Identicon } from '@shared/ui';
import { type Member as MemberType } from '@/domains/collectives';

type Props = {
  item: MemberType;
  chain: Chain;
};

export const Member = ({ item, chain }: Props) => {
  // const identity = useStoreMap({
  //   store: identityModel.$identity,
  //   keys: [item.accountId],
  //   fn: (identity, [accountId]) => identity[accountId] ?? null,
  // });

  const address = toAddress(item.accountId, { prefix: chain.addressPrefix });

  // console.log({ address, identity });

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-3 contain-inline-size hover:bg-block-background-hover">
      <div className="shrink-0">
        <Rank rank={item.rank} />
      </div>
      <div className="relative min-w-0 shrink grow">
        <div className="flex grow items-center gap-4.5 text-text-secondary">
          <Identicon address={address} size={20} canCopy background={false} />
          <Hash value={address} variant="truncate" />
        </div>
        <div className="absolute inset-y-0 left-3 my-auto h-fit w-fit">
          <Indicator active={item.isActive} />
        </div>
      </div>
      <AccountExplorers account={item.accountId} chain={chain} />
    </div>
  );
};

const Rank = ({ rank }: { rank: number }) => {
  let variant: ComponentProps<typeof Label>['variant'] = 'gray';

  if (rank === 2) {
    variant = 'orange';
  }

  if (rank === 3) {
    variant = 'red';
  }

  if (rank === 4) {
    variant = 'purple';
  }

  if (rank === 5) {
    variant = 'lightBlue';
  }

  if (rank === 6) {
    variant = 'green';
  }

  if (rank === 7) {
    variant = 'blue';
  }

  return <Label variant={variant}>{rank.toString()}</Label>;
};

type IndicatorProps = {
  active: boolean;
};

const Indicator = ({ active }: IndicatorProps) => {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-white">
      <div
        className={cnTw('h-2 w-2 rounded-full shadow-[0_0_0_1.5px]', {
          ['bg-text-positive shadow-badge-green-background-default']: active,
          ['bg-chip-text shadow-secondary-button-background']: !active,
        })}
      />
    </div>
  );
};
