import {
  CallBuilder, CallBuilding,
  TransactionBuilder,
  TransactionVisitor
} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet} from "@shared/core/types/wallet";
import {ApiPromise} from "@polkadot/api";
import {BaseTxInfo, methods, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {Chain} from "@shared/core";

export class LeafTransactionBuilder implements TransactionBuilder, CallBuilder {

  currentCalls: CallBuilding[]

  readonly api: ApiPromise
  readonly chain: Chain

  readonly accountInWallet: AccountInWallet

  constructor(
    api: ApiPromise,
    accountInWallet: AccountInWallet,
    chain: Chain,
  ) {
    this.currentCalls = []

    this.api = api
    this.chain = chain

    this.accountInWallet = accountInWallet
  }

  effectiveCallBuilder(): CallBuilder {
    return this
  }

  visitAll(visitor: TransactionVisitor): void {
    this.visitSelf(visitor)
  }

  visitSelf(visitor: TransactionVisitor) {
    if (visitor.visitLeaf == undefined) return

    visitor.visitLeaf({account: this.accountInWallet})
  }

  addCall(call: CallBuilding): void {
    this.currentCalls.push(call)
  }

  resetCalls(): void {
    this.currentCalls = []
  }

  setCall(call: CallBuilding): void {
    this.currentCalls = [call]
  }

  initFrom(callBuilder: CallBuilder): void {
    this.currentCalls = callBuilder.currentCalls
  }

  async unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    const nestedUnsignedTxs = this.currentCalls.map(call => call.viaTxWrapper(info, options))

    if (nestedUnsignedTxs.length == 0) throw new Error("Cannot sign empty transaction")

    let maybeWrappedInBatch: UnsignedTransaction
    if (nestedUnsignedTxs.length > 1) {
      const innerMethods = nestedUnsignedTxs.map((nestedUnsignedTx) => nestedUnsignedTx.method)
      maybeWrappedInBatch = methods.utility.batchAll({calls: innerMethods,}, info, options)
    } else {
      maybeWrappedInBatch = nestedUnsignedTxs[0]
    }

    return maybeWrappedInBatch
  }

  async submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    const viaApiCalls = this.currentCalls.map(call => call.viaApi)

    if (viaApiCalls.length == 0) return null

    let maybeWrappedInBatch: SubmittableExtrinsic<"promise">
    if (viaApiCalls.length > 1) {
      maybeWrappedInBatch = this.api.tx.utility.batchAll(viaApiCalls)
    } else {
      maybeWrappedInBatch = viaApiCalls[0]
    }

    return maybeWrappedInBatch
  }

}
