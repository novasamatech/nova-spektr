import {
  CallBuilder,
  TransactionBuilder,
  TransactionVisitor
} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet} from "@shared/core/types/wallet";
import {Exception} from "@zxing/library";
import {ApiPromise} from "@polkadot/api";
import {BaseTxInfo, methods, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {isOldMultisigPallet} from "@entities/transaction";
import {AccountId} from "@shared/core";

export class MultisigTransactionBuilder implements TransactionBuilder {

  #inner: TransactionBuilder

  readonly effectiveCallBuilder: CallBuilder

  readonly knownSignatoryAccounts: AccountInWallet[]
  #selectedSignatory: AccountInWallet

  readonly signatories: AccountId[]
  readonly threshold: number

  readonly api: ApiPromise

  constructor(
    api: ApiPromise,
    threshold: number,
    signatories: AccountId[],
    knownSignatoryAccounts: AccountInWallet[],
    innerFactory: (signatory: AccountInWallet) => TransactionBuilder,
  ) {
    this.knownSignatoryAccounts = knownSignatoryAccounts

    this.threshold = threshold
    this.signatories = signatories

    this.api = api

    if (knownSignatoryAccounts.length == 0) {
      // TODO maybe handle it gracefully?
      throw new Exception("No known signatories found")
    }
    this.#selectedSignatory = knownSignatoryAccounts[0]
    this.#inner = innerFactory(this.#selectedSignatory)

    this.effectiveCallBuilder = this.#inner.effectiveCallBuilder
  }

  visit(visitor: TransactionVisitor): void {
    visitor.visitMultisig({
      knownSignatories: this.knownSignatoryAccounts,
      threshold: this.threshold
    })

    this.#inner.visit(visitor)
  }

  async submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    const innerInfo = await this.innerInfo()
    if (innerInfo == null) return null

    const {innerCall, innerWeight} = innerInfo

    const otherSignatories = this.otherSignatories()
    const maybeTimepoint = null

    return isOldMultisigPallet(this.api) ?
      // @ts-ignore
      this.api.tx.multisig.asMulti(this.threshold, otherSignatories, maybeTimepoint, innerCall, false, innerWeight)
      : this.api.tx.multisig.asMulti(this.threshold, otherSignatories, maybeTimepoint, innerCall, innerWeight)
  }

  async unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    const innerInfo = await this.innerInfo()
    if (innerInfo == null) throw new Exception("Multisig cannot sign empty nested tx")

    const {innerWeight} = innerInfo
    const maybeTimepoint = null

    const innerUnsignedTx = await this.#inner.unsignedTransaction(options, info)

    return methods.multisig.asMulti(
      {
        threshold: this.threshold,
        otherSignatories: this.otherSignatories(),
        maybeTimepoint: maybeTimepoint,
        maxWeight: innerWeight,
        storeCall: false,
        call: innerUnsignedTx.method,
      },
      info,
      options
    )
  }

  async innerInfo(): Promise<{ innerCall: SubmittableExtrinsic<"promise">, innerWeight: any } | null> {
    const innerCall = await this.#inner.submittableExtrinsic()
    if (innerCall == null) return null

    const paymentInfo = await innerCall.paymentInfo(this.#selectedSignatory.account.accountId)
    const innerWeight = paymentInfo.weight

    return {innerCall, innerWeight}
  }

  otherSignatories(): AccountId[] {
    return this.signatories
      .filter((signatory) => signatory != this.#selectedSignatory.account.accountId)
      .sort()
  }
}
