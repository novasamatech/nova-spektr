import { type ComponentProps, memo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Account } from '@/shared/ui-entities/Account/Account';
import { type WalletNameMode, useAccountName, useWalletName } from '@/domains/network';
import { useOwningWallet } from '../lib/useOwningWallet';

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
   * name otherwise instead of a derivation path. In `fallback` mode, when
   * `wallet` is omitted the owning local wallet is looked up automatically
   * (`useOwningWallet`).
   */
  walletNameAs?: WalletNameMode;
};

export const NamedAccount = memo((props: Props) => {
  const { accountId, chain, title, wallet, walletNameAs = 'override', ...rest } = props;
  const isWalletNameFallback = walletNameAs === 'fallback';
  // The owning-wallet scan is opt-in (it walks every local account): only a
  // fallback-mode caller without an explicit `wallet` needs it.
  const owningWallet = useOwningWallet(isWalletNameFallback && !wallet ? accountId : null, chain);
  const effectiveWallet = wallet ?? owningWallet;
  const walletName = useWalletName(effectiveWallet);
  const resolvedName = useAccountName({
    accountId,
    chain,
    title: isWalletNameFallback ? title : (title ?? walletName ?? undefined),
    fallbackName: isWalletNameFallback ? (walletName ?? undefined) : undefined,
  });

  return (
    <Account
      {...rest}
      accountId={accountId}
      chain={chain ?? null}
      title={resolvedName}
      walletType={effectiveWallet?.type}
    />
  );
});
