import {
  CallBuilder,
  TransactionBuilder,
  TransactionVisitor
} from "@entities/transactionBuilder/model/transaction-builder";
import {AccountInWallet} from "@shared/core/types/wallet";
import {ApiPromise} from "@polkadot/api";
import {BaseTxInfo, methods, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {isOldMultisigPallet} from "@entities/transaction";
import {AccountId, Chain} from "@shared/core";
import {NestedTransactionBuilderFactory} from "@entities/transactionBuilder/lib/factory";

export class MultisigTransactionBuilder implements TransactionBuilder {

  readonly knownSignatoryAccounts: AccountInWallet[]

  readonly signatories: AccountId[]
  readonly threshold: number

  readonly api: ApiPromise
  readonly chain: Chain

  private selectedSignatory: AccountInWallet
  private innerBuilder: TransactionBuilder
  private readonly innerFactory: NestedTransactionBuilderFactory

  constructor(
    api: ApiPromise,
    chain: Chain,
    threshold: number,
    signatories: AccountId[],
    knownSignatoryAccounts: AccountInWallet[],
    innerFactory: NestedTransactionBuilderFactory,
  ) {
    this.knownSignatoryAccounts = knownSignatoryAccounts
    this.innerFactory = innerFactory

    this.threshold = threshold
    this.signatories = signatories

    this.api = api
    this.chain = chain

    if (knownSignatoryAccounts.length == 0) {
      // TODO maybe handle it gracefully?
      throw new Error("No known signatories found")
    }
    this.selectedSignatory = knownSignatoryAccounts[0]
    this.innerBuilder = innerFactory(this.selectedSignatory)
  }

  effectiveCallBuilder(): CallBuilder {
    return this.innerBuilder.effectiveCallBuilder()
  }

  visitAll(visitor: TransactionVisitor): void {
    this.visitSelf(visitor)

    this.innerBuilder.visitAll(visitor)
  }

  visitSelf(visitor: TransactionVisitor) {
    if (visitor.visitMultisig == undefined) return

    visitor.visitMultisig({
      knownSignatories: this.knownSignatoryAccounts,
      threshold: this.threshold,
      selectedSignatory: this.selectedSignatory,
      updateSelectedSignatory: this.updateSelectedSignatory,
    })
  }

  async submittableExtrinsic(): Promise<SubmittableExtrinsic<"promise"> | null> {
    const innerInfo = await this.#innerInfo()
    if (innerInfo == null) return null

    const {innerCall, innerWeight} = innerInfo

    const otherSignatories = this.#otherSignatories()
    const maybeTimepoint = null

    return isOldMultisigPallet(this.api) ?
      // @ts-ignore
      this.api.tx.multisig.asMulti(this.threshold, otherSignatories, maybeTimepoint, innerCall, false, innerWeight)
      : this.api.tx.multisig.asMulti(this.threshold, otherSignatories, maybeTimepoint, innerCall, innerWeight)
  }

  async unsignedTransaction(options: OptionsWithMeta, info: BaseTxInfo): Promise<UnsignedTransaction> {
    const innerInfo = await this.#innerInfo()
    if (innerInfo == null) throw new Error("Multisig cannot sign empty nested tx")

    const {innerWeight} = innerInfo
    const maybeTimepoint = null

    const innerUnsignedTx = await this.innerBuilder.unsignedTransaction(options, info)

    return methods.multisig.asMulti(
      {
        threshold: this.threshold,
        otherSignatories: this.#otherSignatories(),
        maybeTimepoint: maybeTimepoint,
        maxWeight: innerWeight,
        storeCall: false,
        call: innerUnsignedTx.method,
      },
      info,
      options
    )
  }

  updateSelectedSignatory(signatory: AccountInWallet) {
    if (signatory === this.selectedSignatory) return

    const currentCallBuilder = this.effectiveCallBuilder()

    this.selectedSignatory = signatory
    this.innerBuilder = this.innerFactory(signatory)
    this.innerBuilder.effectiveCallBuilder().initFrom(currentCallBuilder)
  }

  async #innerInfo(): Promise<{ innerCall: SubmittableExtrinsic<"promise">, innerWeight: any } | null> {
    const innerCall = await this.innerBuilder.submittableExtrinsic()
    if (innerCall == null) return null

    const paymentInfo = await innerCall.paymentInfo(this.selectedSignatory.account.accountId)
    const innerWeight = paymentInfo.weight

    return {innerCall, innerWeight}
  }

  #otherSignatories(): AccountId[] {
    return this.signatories
      .filter((signatory) => signatory != this.selectedSignatory.account.accountId)
      .sort()
  }
}
