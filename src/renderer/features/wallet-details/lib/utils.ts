import {
  type Contact,
  KeyType,
  type PolkadotVaultWallet,
  type Signatory,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
} from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

import { ForgetStep, ReconnectStep } from './constants';
import { type VaultMap } from './types';

export const wcDetailsUtils = {
  isNotStarted,
  isReconnecting,
  isRejected,
  isReadyToReconnect,
  isFailed,
};

export const walletDetailsUtils = {
  isForgetModalOpen,
  getVaultAccountsMap,
  getMainAccounts,
  getSignatoryName,
};

function isNotStarted(step: ReconnectStep, connected: boolean): boolean {
  return step === ReconnectStep.NOT_STARTED && connected;
}

function isReconnecting(step: ReconnectStep): boolean {
  return step === ReconnectStep.RECONNECTING;
}

function isRejected(step: ReconnectStep): boolean {
  return step === ReconnectStep.REJECTED;
}

function isFailed(step: ReconnectStep): boolean {
  return step === ReconnectStep.FAILED;
}

function isReadyToReconnect(step: ReconnectStep, connected: boolean): boolean {
  return isRejected(step) || (step === ReconnectStep.NOT_STARTED && !connected);
}

function isForgetModalOpen(step: ForgetStep): boolean {
  return [ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(step);
}

function getVaultAccountsMap(accounts: PolkadotVaultWallet['accounts']): VaultMap {
  const accountGroups = accountUtils.getAccountsAndShardGroups(accounts);

  return accountGroups.reduce<VaultMap>((acc, account) => {
    const accountToInsert = accountUtils.isAccountWithShards(account) ? account[0] : account;

    const chainId = accountToInsert.chainId;
    if (acc[chainId]) {
      acc[chainId].push(account);
    } else {
      acc[chainId] = [account];
    }

    return acc;
  }, {});
}

function getMainAccounts(accounts: (VaultChainAccount | VaultShardAccount[])[]): VaultChainAccount[] {
  return accounts.filter(account => {
    return !accountUtils.isAccountWithShards(account) && account.keyType === KeyType.MAIN;
  }) as VaultChainAccount[];
}

function getSignatoryName(
  signatoryId: AccountId,
  txSignatories: Signatory[],
  contacts: Contact[],
  wallets: Wallet[],
  addressPrefix?: number,
): string {
  const finderFn = <T extends { accountId: AccountId }>(collection: T[]): T | undefined => {
    return collection.find(c => c.accountId === signatoryId);
  };

  // signatory data source priority: transaction -> contacts -> wallets -> address
  const fromTx = finderFn(txSignatories)?.name;
  if (fromTx) return fromTx;

  const fromContact = finderFn(contacts)?.name;
  if (fromContact) return fromContact;

  const accounts = wallets.map(wallet => wallet.accounts).flat();
  const fromAccount = finderFn(accounts)?.name;
  if (fromAccount) return fromAccount;

  return toShortAddress(toAddress(signatoryId, { prefix: addressPrefix }), 5);
}
