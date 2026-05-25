import { memo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useAccountName, useWalletName } from '@/domains/network';

type Props = {
  accountId: AccountId | null | undefined;
  chain?: Chain | null;
  /**
   * Hard override — wins over all resolution. Reserve for cases where the
   * caller has _already_ resolved the right name. For normal display, pass
   * `wallet` and let the resolver do its job.
   */
  title?: string;
  /**
   * When the account belongs to a local wallet, feeds `useWalletName` through
   * as the name fallback — same chain `NamedAccount` runs.
   */
  wallet?: Wallet | null;
};

export const AccountName = memo(({ accountId, chain, title, wallet }: Props) => {
  const walletName = useWalletName(wallet);
  const name = useAccountName({ accountId, chain, title: title ?? walletName ?? undefined });

  return name ?? null;
});
