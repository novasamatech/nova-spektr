import {Account, AccountId, MultisigAccount, Wallet, WalletType} from "@shared/core";
import {TransactionBuilder} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet} from "@shared/core/types/wallet";
import keyBy from 'lodash/keyBy';
import {walletUtils} from "@entities/wallet";
import {Exception} from "@zxing/library";
import {LeafTransactionBuilder} from "@entities/transactionBuilder/lib/leaf";
import {MultisigTransactionBuilder} from "@entities/transactionBuilder/lib/multisig";
import {groupBy} from "lodash";
import {CompoundWalletTransactionBuilder} from "@entities/transactionBuilder/lib/compound-wallet";
import {ApiPromise} from "@polkadot/api";

export function createTransactionBuilder(
  activeWallet: Wallet,
  activeAccounts: Account[],
  allWallets: Wallet[],
  allAccounts: Account[],
  api: ApiPromise
): TransactionBuilder {

  const walletsById = keyBy(allWallets, 'id')
  const accountsByAccountId = groupBy(allAccounts, "accountId")

  const createInner = (accountInWallet: AccountInWallet) => {
    const wallet = accountInWallet.wallet

    switch (walletUtils.getWalletFamily(wallet)) {
      case WalletType.MULTISIG:
        const multisigAccount = accountInWallet.account as MultisigAccount
        const matchingAccounts = multisigAccount.signatories.flatMap((signatory) => {
          return findMatchingAccounts(signatory.accountId, walletsById, accountsByAccountId)
        })

        return new MultisigTransactionBuilder(
          api,
          multisigAccount.threshold,
          multisigAccount.signatories.map((signatory) => signatory.accountId),
          matchingAccounts,
          createInner
        )

      case WalletType.WATCH_ONLY:
        throw new Exception("Signing with Watch only is not allowed")

      case WalletType.WALLET_CONNECT:
      case WalletType.NOVA_WALLET:
      case WalletType.POLKADOT_VAULT:
        return new LeafTransactionBuilder(api, accountInWallet)
    }
  }

  if (activeAccounts.length > 1) {
    return new CompoundWalletTransactionBuilder(api, activeWallet, activeAccounts, createInner)
  } else {
    return createInner({ wallet: activeWallet, account: activeAccounts[0] })
  }
}

function findMatchingAccounts(
  accountId: AccountId,
  allWalletsById: Record<number, Wallet>,
  allAccountsById: Record<AccountId, Account[]>
): AccountInWallet[] {
  const idMatchingAccounts = allAccountsById[accountId]

  return idMatchingAccounts.map((account) => {
      const wallet = allWalletsById[account.walletId]
      const accountInWallet: AccountInWallet = {wallet, account}
      return accountInWallet
    }
  ).filter((accountInWallet) => {
    !walletUtils.isWatchOnly(accountInWallet.wallet)
  })
}
