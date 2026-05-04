import { type Contact, type Wallet, isBackendContact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type ContactCandidate, type MultisigCandidate, type WalletCandidate } from '../types';

export function mergeMultisigCandidates(wallets: Wallet[], contacts: Contact[]): MultisigCandidate[] {
  const fromWallets: WalletCandidate[] = wallets.filter(walletUtils.isRegularMultisig).flatMap(wallet => {
    const account = wallet.accounts.find(accountUtils.isAnyMultisigAccount);

    if (!account || account.signatories.length === 0) return [];

    return [
      {
        source: 'wallet',
        walletId: wallet.id,
        name: wallet.name,
        // No chain context available at this level; use substrate generic prefix (42).
        // Downstream code can re-encode with a chain-specific prefix if needed.
        address: toAddress(account.accountId),
        accountId: account.accountId,
        signatories: account.signatories.map(s => s.accountId),
        threshold: account.threshold,
      },
    ];
  });

  const fromContacts: ContactCandidate[] = contacts
    .filter(isBackendContact)
    .filter(c => c.signatories !== null && c.signatories.length > 0 && c.threshold !== null)
    .map(c => ({
      source: 'contact',
      contactId: c.id,
      name: c.name,
      address: c.address,
      accountId: c.accountId,
      // BackendContact.signatories are hex strings — convert each to typed AccountId
      signatories: c.signatories!.map(toAccountId),
      threshold: c.threshold!,
    }));

  return [...fromWallets, ...fromContacts];
}
