import { AccountID, ChainId, HexString, PublicKey } from './shared-kernel';
import { Signatory } from './signatory';

export const enum TransactionType {
  TRANSFER = 'transfer',
  ORML_TRANSFER = 'ormlTransfer',
  ASSET_TRANSFER = 'assetTransfer',
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

export enum MiltisigTransactionFinalStatus {
  ESTABLISHED = 'ESTABLISHED',
  CANCELLED = 'CANCELLED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type MultisigTransactionStatus = 'SIGNING' | MiltisigTransactionFinalStatus;

export type Transaction = {
  type: TransactionType;
  address: AccountID;
  chainId: ChainId;
  args: Record<string, any>;
};

export type MultisigEvent = {
  status: SigningStatus;
  signatory: Signatory;
  multisigOutcome?: MultisigTransactionStatus;
  extrinsicHash?: HexString;
  eventBlock?: number;
  eventIndex?: number;
};

export type MultisigTransaction = {
  callData?: HexString;
  publicKey: PublicKey;
  chainId: ChainId;
  callHash: HexString;
  events: MultisigEvent[];
  status: MultisigTransactionStatus;
  signatories: Signatory[];
  deposit: string;
  depositor: PublicKey;
  description?: string;
  cancelDescription?: string;
  blockCreated?: number;
  indexCreated?: number;
  dateCreated?: number;
  transaction?: Transaction;
};
