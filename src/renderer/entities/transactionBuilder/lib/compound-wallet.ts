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

export class CompoundWalletTransactionBuilder implements TransactionBuilder {

  effectiveCallBuilder: CallBuilder;

  readonly wallet: Wallet
  readonly shards: Account[]

  readonly api: ApiPromise

  #inner: TransactionBuilder

  constructor(
    api: ApiPromise,
    wallet: Wallet,
    shards: Account[],
    innerFactory: (shard: AccountInWallet) => TransactionBuilder
  ) {
    this.wallet = wallet
    this.shards = shards
    this.api = api

    if (shards.length == 0) throw new Error("Empty shard list")

    const firstAccountInWallet: AccountInWallet = {
      wallet: wallet,
      account: shards[0]
    }
    this.#inner = innerFactory(firstAccountInWallet)
    this.effectiveCallBuilder = this.#inner.effectiveCallBuilder
  }

  visit(visitor: TransactionVisitor): void {
    visitor.visitCompoundWallet({
      wallet: this.wallet,
      childrenAccounts: this.shards
    })

    this.#inner.visit(visitor)
  }

  unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    return this.#inner.unsignedTransaction(options, info)
  }

  submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    return this.#inner.submittableExtrinsic()
  }
}
