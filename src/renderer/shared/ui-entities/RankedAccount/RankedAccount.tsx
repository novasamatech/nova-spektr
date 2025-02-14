import { type PropsWithChildren } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Identicon } from '@/shared/ui';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';
import { Address } from '../Address/Address';
import { CollectiveRank } from '../CollectiveRank/CollectiveRank';

type Props = {
  name?: string;
  rank: number;
  isActive: boolean;
  accountId: AccountId;
  chain: Chain;
};

export const RankedAccount = ({ name, rank, isActive, accountId, chain, children }: PropsWithChildren<Props>) => {
  const address = toAddress(accountId, { prefix: chain.addressPrefix });

  return (
    <div className="flex items-center justify-between">
      <div className="flex grow items-center gap-2 px-2 py-3 contain-inline-size">
        <div className="shrink-0">
          <CollectiveRank rank={rank} />
        </div>
        <div className="relative min-w-0 shrink grow">
          <div className="flex grow items-center gap-4.5">
            <Identicon address={address} size={20} canCopy background={false} />
            <Address title={name} address={address} showIcon={false} hideAddress variant="truncate" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-3 my-auto h-fit w-fit">
            <Indicator active={isActive} />
          </div>
        </div>
        <AccountExplorers accountId={accountId} chain={chain} />
      </div>
      {children}
    </div>
  );
};

type IndicatorProps = {
  active: boolean;
};

const Indicator = ({ active }: IndicatorProps) => {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-white">
      <div
        className={cnTw(
          'h-2 w-2 rounded-full shadow-[0_0_0_1.5px]',
          active
            ? 'bg-text-positive shadow-badge-green-background-default'
            : 'bg-chip-text shadow-secondary-button-background',
        )}
      />
    </div>
  );
};
