import {Account, Wallet} from "@shared/core";
import {AccountInWallet} from "@shared/core/types/wallet";
import {ApiPromise} from "@polkadot/api";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {BaseTxInfo, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";

export interface TransactionBuilder {

  readonly api: ApiPromise

  effectiveCallBuilder(): CallBuilder

  visit(visitor: TransactionVisitor): void

  submittableExtrinsic(): Promise<SubmittableExtrinsic<'promise'> | null>

  unsignedTransaction(
    options: OptionsWithMeta,
    info: BaseTxInfo
  ): Promise<UnsignedTransaction>
}

export interface CallBuilder {

  readonly currentCalls: CallBuilding[]

  addCall(call: CallBuilding): void

  setCall(call: CallBuilding): void

  initFrom(callBuilder: CallBuilder): void

  resetCalls(): void
}

export type CallBuilding = {
  fee: SubmittableExtrinsic<any>
  signing: (info: BaseTxInfo, options: OptionsWithMeta) => UnsignedTransaction
}

export interface TransactionVisitor {

  visitMultisig(visit: MultisigVisit): void

  visitCompoundWallet(visit: CompoundWalletVisit): void
}

export interface MultisigVisit {

  knownSignatories: AccountInWallet[]

  threshold: number

  updateSelectedSignatory(newSignatory: AccountInWallet): void
}

export interface CompoundWalletVisit {

  childrenAccounts: Account[]

  wallet: Wallet

  updateSelectedShard(shard: Account): void
}
