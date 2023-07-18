import { Address, ChainId, HexString, AccountId, CallData, CallHash } from './shared-kernel';
import { Signatory } from './signatory';
import { PartialBy } from '@renderer/domain/utility';

export const enum TransactionType {
  TRANSFER = 'transfer',
  ORML_TRANSFER = 'ormlTransfer',
  ASSET_TRANSFER = 'assetTransfer',
  MULTISIG_AS_MULTI = 'multisig_as_multi',
  MULTISIG_APPROVE_AS_MULTI = 'multisig_approve_as_multi',
  MULTISIG_CANCEL_AS_MULTI = 'cancel_as_multi',
  BOND = 'bond',
  STAKE_MORE = 'bondExtra',
  UNSTAKE = 'unbond',
  RESTAKE = 'rebond',
  REDEEM = 'withdrawUnbonded',
  NOMINATE = 'nominate',
  BATCH_ALL = 'batchAll',
  DESTINATION = 'payee',
  CHILL = 'chill',
}

export type SigningStatus =
  | 'PENDING_SIGNED'
  | 'PENDING_CANCELLED'
  | 'SIGNED'
  | 'CANCELLED'
  | 'ERROR_SIGNED'
  | 'ERROR_CANCELLED';

export const enum MultisigTxInitStatus {
  SIGNING = 'SIGNING',
}

export const enum MultisigTxFinalStatus {
  ESTABLISHED = 'ESTABLISHED',
  CANCELLED = 'CANCELLED',
  EXECUTED = 'EXECUTED',
  ERROR = 'ERROR',
}

export type MultisigTxStatus = MultisigTxInitStatus | MultisigTxFinalStatus;

// TODO: extend args for all Transaction types
// TODO: use it for send transaction
export type Transaction = {
  type: TransactionType;
  address: Address;
  chainId: ChainId;
  args: Record<string, any>;
};

// TODO: use it for decoding only
export type DecodedTransaction = PartialBy<Transaction, 'type'> & {
  method: string;
  section: string;
};

export type MultisigEvent = {
  txAccountId: AccountId;
  txChainId: ChainId;
  txCallHash: CallHash;
  txBlock: number;
  txIndex: number;
  accountId: AccountId;
  status: SigningStatus;
  multisigOutcome?: MultisigTxStatus;
  extrinsicHash?: HexString;
  eventBlock?: number;
  eventIndex?: number;
  dateCreated?: number;
};

export type MultisigTransaction = {
  accountId: AccountId;
  chainId: ChainId;
  callData?: CallData;
  callHash: CallHash;
  status: MultisigTxStatus;
  signatories: Signatory[];
  deposit?: string;
  depositor?: AccountId;
  description?: string;
  cancelDescription?: string;
  blockCreated: number;
  indexCreated: number;
  dateCreated?: number;
  transaction?: Transaction | DecodedTransaction;
};

export type MultisigTransactionKey = Pick<
  MultisigTransaction,
  'accountId' | 'callHash' | 'chainId' | 'indexCreated' | 'blockCreated'
>;

export function isDecodedTx(tx: Transaction | DecodedTransaction): tx is DecodedTransaction {
  const hasType = tx.type != undefined;
  const hasMethod = (tx as DecodedTransaction).method != undefined;
  const hasSection = (tx as DecodedTransaction).section != undefined;

  return !hasType && hasMethod && hasSection;
}
