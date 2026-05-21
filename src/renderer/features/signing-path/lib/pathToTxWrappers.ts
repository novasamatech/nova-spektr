import {
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type TxWrapper,
  type Wallet,
  WrapperKind,
} from '@/shared/core';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

/**
 * Builds the legacy `TxWrapper[]` array used by
 * `transactionService.getWrappedTransaction` from a user-picked signing path.
 * Mirrors what `getTxWrappers` produces from a wallet's account graph, but
 * driven by `$signingPath` so the user's hop choices (alternate multisig,
 * alternate proxy) are honoured at signing time.
 *
 * Flex-multisig handling matches `getMultisigWrapper`: a flex-multisig
 * generates a `proxied → multisig → signer` path because its `accountId` is a
 * pure proxy delegating to `multisigAccountId`, but the legacy code collapses
 * that into a single MULTISIG wrapper carrying the flex itself as
 * `multisigAccount`. We do the same — skip the proxy node when the resolved
 * account is a flex facade, and look up the flex on the multisig node via
 * `multisigAccountId`.
 */
export function pathToTxWrappers(path: PathNode[], allAccounts: AnyAccount[], wallets: Wallet[]): TxWrapper[] {
  return path.slice(0, -1).flatMap<TxWrapper>((node, i) => {
    const signer = allAccounts.find((a) => a.accountId === path[i + 1]!.accountId);
    if (!signer) return [];

    if (node.kind === 'multisig') {
      const multisig = findMultisigForNode(node.accountId, allAccounts);
      if (!multisig) return [];

      return [
        {
          kind: WrapperKind.MULTISIG,
          // MultisigTxWrapper.multisigAccount is typed strictly as MultisigAccount
          // but the wrap code only reads .signatories / .threshold, both of which
          // FlexibleMultisigAccount carries identically.
          multisigAccount: multisig as MultisigAccount,
          signatories: collectSigners(multisig, wallets),
          signer,
        },
      ];
    }

    if (node.kind === 'proxied') {
      const account = allAccounts.find((a) => a.accountId === node.accountId);
      // Skip flex-multisig facades — the multisig hop that follows resolves
      // back to the same flex via `multisigAccountId` and emits the single
      // MULTISIG wrapper that legacy `getMultisigWrapper` would produce.
      if (!account || accountUtils.isFlexibleMultisigAccount(account)) return [];
      if (!accountUtils.isProxiedAccount(account)) return [];

      return [{ kind: WrapperKind.PROXY, proxyAccount: signer, proxiedAccount: account }];
    }

    return [];
  });
}

const findMultisigForNode = (
  accountId: AnyAccount['accountId'],
  allAccounts: AnyAccount[],
): MultisigAccount | FlexibleMultisigAccount | undefined => {
  for (const account of allAccounts) {
    if (accountUtils.isMultisigAccount(account) && account.accountId === accountId) return account;
    if (accountUtils.isFlexibleMultisigAccount(account) && account.multisigAccountId === accountId) return account;
  }
  return undefined;
};

const collectSigners = (multisig: MultisigAccount | FlexibleMultisigAccount, wallets: Wallet[]): AnyAccount[] => {
  const ids = new Set(multisig.signatories.map((s) => s.accountId));
  return wallets
    .map((wallet) => wallet.accounts.find((a) => ids.has(a.accountId)))
    .filter((a): a is AnyAccount => a !== undefined);
};
