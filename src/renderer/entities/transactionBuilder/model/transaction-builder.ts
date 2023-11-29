import {Account, Chain, Wallet} from "@shared/core";
import {AccountInWallet} from "@shared/core/types/wallet";
import {ApiPromise} from "@polkadot/api";
import {SubmittableExtrinsic} from "@polkadot/api/types";
import {BaseTxInfo, OptionsWithMeta, UnsignedTransaction} from "@substrate/txwrapper-polkadot";

export interface TransactionBuilder {

  readonly chain: Chain

  readonly api: ApiPromise

  effectiveCallBuilder(): CallBuilder

  visitAll(visitor: TransactionVisitor): void

  visitSelf(visitor: TransactionVisitor): void

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

  visitMultisig?(visit: MultisigVisit): void

  visitCompoundWallet?(visit: CompoundWalletVisit): void

  visitLeaf?(visit: LeafVisit): void
}

export interface MultisigVisit {

  knownSignatories: AccountInWallet[]

  threshold: number

  selectedSignatory: AccountInWallet

  updateSelectedSignatory(newSignatory: AccountInWallet): void
}

export interface CompoundWalletVisit {

  allChildrenAccounts: Account[]

  selectedChildrenAccounts: Account[]

  wallet: Wallet

  updateSelectedChildren(selectedChildren: Account[]): void
}

export interface LeafVisit {

  account: AccountInWallet
}
