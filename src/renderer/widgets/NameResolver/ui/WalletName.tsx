import { memo } from 'react';

import { type Wallet } from '@/shared/core';
import { useWalletName } from '@/domains/network';

type Props = {
  wallet: Wallet | null | undefined;
};

export const WalletName = memo(({ wallet }: Props) => {
  const name = useWalletName(wallet);

  return name;
});
