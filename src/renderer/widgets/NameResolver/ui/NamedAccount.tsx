import { type ComponentProps, memo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Account } from '@/shared/ui-entities/Account/Account';
import { useAccountName, useWalletName } from '@/domains/network';

type Props = Omit<ComponentProps<typeof Account>, 'chain' | 'walletType'> & {
  accountId: AccountId;
  chain: Chain | undefined;
  /**
   * Explicit hard override. When set, wins over all resolution. Reserve for
   * cases where the caller has _already_ resolved the right name and wants to
   * force it. For normal account display, pass `wallet` instead and let the
   * resolver do its job.
   */
  title?: string;
  /**
   * Drives both the resolved name (via `useWalletName`) and the wallet-type
   * badge icon. If `title` is also set, `title` wins for the name but the
   * wallet badge still shows.
   */
  wallet?: Wallet | null;
};

export const NamedAccount = memo((props: Props) => {
  const { accountId, chain, title, wallet, ...rest } = props;
  // useWalletName runs the full chain (custom name → local/backend contact →
  // identity → wallet.name) so it produces a "best name" we want to win over
  // useAccountName's short-address fallback.
  const walletName = useWalletName(wallet);
  const resolvedName = useAccountName({ accountId, chain, title: title ?? walletName ?? undefined });

  return (
    <Account {...rest} accountId={accountId} chain={chain ?? null} title={resolvedName} walletType={wallet?.type} />
  );
});
