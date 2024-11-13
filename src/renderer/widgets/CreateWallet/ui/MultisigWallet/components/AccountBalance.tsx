import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw, formatAsset, nullable, totalAmountBN } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { balanceModel } from '@/entities/balance';

type Props = {
  accountId: string;
  chain: Chain;
};

export const AccountBalance = ({ accountId, chain }: Props) => {
  const balances = useUnit(balanceModel.$balances);
  const asset = chain.assets.at(0);
  const balance = useMemo(() => {
    if (nullable(asset)) return null;

    return (
      balances.find(
        (x) => x.accountId === accountId && x.chainId == chain.chainId && x.assetId === asset.assetId.toString(),
      ) ?? null
    );
  }, [accountId, chain, asset, balances]);

  if (!balance || !asset) {
    return null;
  }

  const totalAmount = totalAmountBN(balance);

  return (
    <FootnoteText
      className={cnTw(
        'shrink-0 whitespace-nowrap',
        totalAmount.isZero() ? 'text-text-negative' : 'text-text-secondary',
      )}
    >
      {formatAsset(totalAmount, asset)}
    </FootnoteText>
  );
};
