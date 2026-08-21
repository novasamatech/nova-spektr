import { type ComponentProps, memo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Account } from '@/shared/ui-entities/Account/Account';
import { useAccountName, useWalletName } from '@/domains/network';

type Props = Omit<ComponentProps<typeof Account>, 'chain' | 'walletType'> & {
  accountId: AccountId;
  /**
   * `null` and `undefined` both mean "no chain": the name resolves without a
   * prefix and the address falls back to the generic encoding.
   */
  chain: Chain | null | undefined;
  /**
   * Explicit hard override. When set, wins over all resolution. Reserve for
   * cases where the caller has _already_ resolved the right name and wants to
   * force it. For normal account display, pass `wallet` instead and let the
   * resolver do its job.
   */
  title?: string;
  /**
   * Drives both the resolved name (via `useWalletName`) and the wallet-type
   * badge icon. How the wallet name takes part in the name resolution is up to
   * `walletNameAs`. If `title` is also set, `title` wins for the name but the
   * wallet badge still shows.
   */
  wallet?: Wallet | null;
  /**
   * How the wallet name takes part in resolution. `override` (default, legacy):
   * the resolved wallet name is passed as `title` and wins over everything.
   * `fallback`: the account resolves on its own (custom name → contacts →
   * identity) and the wallet name only fills in before the stored account name
   * / short address — so a contact name shows when there is one, and the keyset
   * name otherwise instead of a derivation path.
   */
  walletNameAs?: 'override' | 'fallback';
};

export const NamedAccount = memo((props: Props) => {
  const { accountId, chain, title, wallet, walletNameAs = 'override', ...rest } = props;
  // useWalletName runs the full chain (custom name → local/backend contact →
  // identity → wallet.name) so it produces a "best name" for the wallet. In
  // `override` mode it is passed as `title` and beats everything; in `fallback`
  // mode the account resolves on its own and this only fills in before the
  // stored account name / short address.
  const walletName = useWalletName(wallet);
  const resolvedName = useAccountName({
    accountId,
    chain,
    title: walletNameAs === 'fallback' ? title : (title ?? walletName ?? undefined),
    fallbackName: walletNameAs === 'fallback' ? (walletName ?? undefined) : undefined,
  });

  return (
    <Account {...rest} accountId={accountId} chain={chain ?? null} title={resolvedName} walletType={wallet?.type} />
  );
});
