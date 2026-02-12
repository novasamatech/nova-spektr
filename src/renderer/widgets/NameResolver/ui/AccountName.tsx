import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useAccountName } from '@/domains/network';

type Props = {
  accountId: AccountId | null | undefined;
  chain?: Chain | null;
  title?: string;
};

export const AccountName = memo(({ accountId, chain, title }: Props) => {
  const name = useAccountName({ accountId, chain, title });

  return name ?? null;
});
