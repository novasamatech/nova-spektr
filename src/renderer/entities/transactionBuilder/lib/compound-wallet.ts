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
import {NestedTransactionBuilderFactory} from "@entities/transactionBuilder/lib/factory";

export class CompoundWalletTransactionBuilder implements TransactionBuilder {

  readonly wallet: Wallet
  readonly shards: Account[]

  #selectedShard: Account

  readonly api: ApiPromise

  #inner: TransactionBuilder
  readonly #innerFactory: NestedTransactionBuilderFactory

  constructor(
    api: ApiPromise,
    wallet: Wallet,
    shards: Account[],
    innerFactory: NestedTransactionBuilderFactory
  ) {
    this.wallet = wallet
    this.shards = shards
    this.api = api
    this.#innerFactory = innerFactory

    if (shards.length == 0) throw new Error("Empty shard list")

    const firstShard = shards[0]
    const firstAccountInWallet: AccountInWallet = {
      wallet: wallet,
      account: firstShard
    }
    this.#selectedShard = firstShard
    this.#inner = this.#innerFactory(firstAccountInWallet)
  }

  effectiveCallBuilder(): CallBuilder {
    return this.#inner.effectiveCallBuilder()
  }

  visit(visitor: TransactionVisitor): void {
    visitor.visitCompoundWallet({
      wallet: this.wallet,
      childrenAccounts: this.shards,
      updateSelectedShard: this.updateSelectedShard,
    })

    this.#inner.visit(visitor)
  }

  unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    return this.#inner.unsignedTransaction(options, info)
  }

  submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    return this.#inner.submittableExtrinsic()
  }

  updateSelectedShard(shard: Account) {
    if (shard === this.#selectedShard) return

    const currentCallBuilder = this.effectiveCallBuilder()
    const newAccountInWallet: AccountInWallet = {
      wallet: this.wallet,
      account: shard
    }

    this.#selectedShard = shard
    this.#inner = this.#innerFactory(newAccountInWallet)
    this.#inner.effectiveCallBuilder().initFrom(currentCallBuilder)
  }
}
