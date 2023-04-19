import { Address, ChainID, HexString, AccountID, CallData, CallHash } from './shared-kernel';
import { Signatory } from './signatory';

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

export type Transaction = {
  type: TransactionType;
  address: Address;
  chainId: ChainID;
  args: Record<string, any>;
};

export type MultisigEvent = {
  status: SigningStatus;
  accountId: AccountID;
  multisigOutcome?: MultisigTxStatus;
  extrinsicHash?: HexString;
  eventBlock?: number;
  eventIndex?: number;
};

export type MultisigTransaction = {
  accountId: AccountID;
  chainId: ChainID;
  callData?: CallData;
  callHash: CallHash;
  events: MultisigEvent[];
  status: MultisigTxStatus;
  signatories: Signatory[];
  deposit?: string;
  depositor?: AccountID;
  description?: string;
  cancelDescription?: string;
  blockCreated?: number;
  indexCreated?: number;
  dateCreated?: number;
  transaction?: Transaction;
};
