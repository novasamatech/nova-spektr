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

      const proxiedAccount = node.proxyType
        ? {
            ...account,
            connections: account.connections.filter(
              (connection) => connection.proxyAccountId === signer.accountId && connection.proxyType === node.proxyType,
            ),
          }
        : account;

      return [{ kind: WrapperKind.PROXY, proxyAccount: signer, proxiedAccount }];
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
