import {AccountsInWallet, asMany} from "@shared/core/types/wallet";
import {
  CompoundWalletVisit,
  LeafVisit,
  MultisigVisit,
  TransactionBuilder
} from "@entities/transactionBuilder/model/transaction-builder";
import {AmountReduction, buildAmountReduction} from "@entities/transactionBuilder/lib/helpers/amount-reduction";
import {ApiPromise} from "@polkadot/api";
import {UnsignedTransaction} from "@substrate/txwrapper-polkadot";
import {createTxMetadatas, toAddress} from "@shared/lib/utils";

export function getSigningAccounts(transactionBuilder: TransactionBuilder): AccountsInWallet | undefined {
  let signingAccounts: AccountsInWallet | undefined = undefined

  transactionBuilder.visitSelf({
    visitLeaf(visit: LeafVisit) {
      signingAccounts = asMany(visit.account)
    },

    visitMultisig(visit: MultisigVisit) {
      signingAccounts = asMany(visit.selectedSignatory)
    },

    visitCompoundWallet(visit: CompoundWalletVisit) {
      signingAccounts = {
        wallet: visit.wallet,
        accounts: visit.selectedChildrenAccounts
      }
    }
  })

  return signingAccounts
}

export async function getTransactionFee(transactionBuilder: TransactionBuilder): Promise<AmountReduction | undefined> {
  const signingAccounts = getSigningAccounts(transactionBuilder)
  if (signingAccounts == undefined) return undefined

  const singleTx = await transactionBuilder.submittableExtrinsic()
  const singleTxFee = await singleTx?.paymentInfo(signingAccounts.accounts[0].accountId)
  if (singleTxFee == undefined) return undefined

  const reductionBuilder = buildAmountReduction()

  signingAccounts.accounts.forEach((account) => {
    reductionBuilder.addReductionAmount(account.accountId, singleTxFee.partialFee.toBigInt())
  })

  return reductionBuilder.build()
}

export async function getDeposits(transactionBuilder: TransactionBuilder): Promise<AmountReduction> {
  const reductionBuilder = buildAmountReduction()

  const multisigDeposit = await getMultisigDeposit(transactionBuilder.api)

  transactionBuilder.visitAll({
    visitMultisig(visit: MultisigVisit) {
      // TODO check who pays deposit in case multisig is wrapped in some other structure, like proxy
      reductionBuilder.addReductionAmount(visit.selectedSignatory.account.accountId, multisigDeposit)
    },
  })

  return reductionBuilder.build()
}

export async function getUnsignedTransactions(transactionBuilder: TransactionBuilder): Promise<UnsignedTransaction[]> {
  const signers = getSigningAccounts(transactionBuilder)
  if (signers == undefined) throw new Error("No signing accounts found")

  const addresses = signers.accounts.map((signer) => {
    return toAddress(signer.accountId, {prefix: transactionBuilder.chain.addressPrefix})
  })

  const txMetadatas = await createTxMetadatas(addresses, transactionBuilder.api)

  return Promise.all(
    txMetadatas.map(({options, info}) => {
      return transactionBuilder.unsignedTransaction(options, info)
    })
  )
}

async function getMultisigDeposit(api: ApiPromise): Promise<bigint> {
  const {depositFactor, depositBase} = api.consts.multisig;
  return depositFactor.toBigInt() * depositBase.toBigInt()
}
