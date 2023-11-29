import {
  CallBuilder, CallBuilding,
  TransactionBuilder,
  TransactionVisitor
} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet} from "@shared/core/types/wallet";
import {ApiPromise} from "@polkadot/api";
import {BaseTxInfo, methods, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {SubmittableExtrinsic} from "@polkadot/api/types";

export class LeafTransactionBuilder implements TransactionBuilder, CallBuilder {

  effectiveCallBuilder: CallBuilder;
  #calls: CallBuilding[]

  api: ApiPromise

  readonly accountInWallet: AccountInWallet

  constructor(api: ApiPromise, accountInWallet: AccountInWallet) {
    this.effectiveCallBuilder = this
    this.#calls = []
    this.api = api

    this.accountInWallet = accountInWallet
  }

  visit(_: TransactionVisitor): void {
    // nothing interesting to visit in the leaf
  }

  addCall(call: CallBuilding): void {
    this.#calls.push(call)
  }

  resetCalls(): void {
    this.#calls = []
  }

  setCall(call: CallBuilding): void {
    this.#calls = [call]
  }

  async unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    const nestedUnsignedTxs = this.#calls.map(call => call.signing(info, options))

    if (nestedUnsignedTxs.length == 0) throw new Error("Cannot sign empty transaction")

    let maybeWrappedInBatch: UnsignedTransaction
    if (nestedUnsignedTxs.length > 1) {
      const innerMethods = nestedUnsignedTxs.map((nestedUnsignedTx) => nestedUnsignedTx.method)
      maybeWrappedInBatch = methods.utility.batch({calls: innerMethods,}, info, options)
    } else {
      maybeWrappedInBatch = nestedUnsignedTxs[0]
    }

    return maybeWrappedInBatch
  }

  async submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    const feeCalls = this.#calls.map(call => call.fee)

    if (feeCalls.length == 0) return null

    let maybeWrappedInBatch: SubmittableExtrinsic<"promise">
    if (feeCalls.length > 1) {
      maybeWrappedInBatch = this.api.tx.utility.batch(feeCalls)
    } else {
      maybeWrappedInBatch = feeCalls[0]
    }

    return maybeWrappedInBatch
  }
}
