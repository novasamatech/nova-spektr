import {
  CallBuilder,
  TransactionBuilder,
  TransactionVisitor
} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet, Wallet} from "@shared/core/types/wallet";
import {Account} from "@shared/core";
import {ApiPromise} from "@polkadot/api";
import {BaseTxInfo, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {LeafTransactionBuilder} from "@entities/transactionBuilder/lib/leaf";

export class CompoundWalletTransactionBuilder implements TransactionBuilder {

  readonly wallet: Wallet
  readonly allChildrenAccounts: Account[]

  #selectedSChildrenAccounts: Account[]

  readonly api: ApiPromise

  #inner: TransactionBuilder

  constructor(
    api: ApiPromise,
    wallet: Wallet,
    childrenAccounts: Account[],
  ) {
    this.wallet = wallet
    this.allChildrenAccounts = childrenAccounts
    this.api = api

    if (childrenAccounts.length == 0) throw new Error("Empty children accounts list")

    const firstChild = childrenAccounts[0]
    const firstChildInWallet: AccountInWallet = {
      wallet: wallet,
      account: firstChild
    }
    this.#selectedSChildrenAccounts = [firstChild]
    // We cannot have complex structure for wallets with multiple accounts per chain
    this.#inner = new LeafTransactionBuilder(api, firstChildInWallet)
  }

  effectiveCallBuilder(): CallBuilder {
    return this.#inner.effectiveCallBuilder()
  }

  visitAll(visitor: TransactionVisitor): void {
    this.visitSelf(visitor)

    this.#inner.visitAll(visitor)
  }

  visitSelf(visitor: TransactionVisitor) {
    visitor.visitCompoundWallet({
      wallet: this.wallet,
      allChildrenAccounts: this.allChildrenAccounts,
      selectedChildrenAccounts: this.#selectedSChildrenAccounts,
      updateSelectedChildren: this.#updateSelectedSChildren,
    })
  }

  unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    return this.#inner.unsignedTransaction(options, info)
  }

  submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    return this.#inner.submittableExtrinsic()
  }

  #updateSelectedSChildren(selectedChildren: Account[]) {
    // No need to re-create `inner` since it is the leaf and won't change anyway
    this.#selectedSChildrenAccounts = selectedChildren
  }
}
