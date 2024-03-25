import type { Address, ChainId, HexString, AccountId, CallData, CallHash, PartialBy, Signatory } from '@shared/core';

export const enum TransactionType {
  TRANSFER = 'transfer',
  ORML_TRANSFER = 'ormlTransfer',
  ASSET_TRANSFER = 'assetTransfer',

  MULTISIG_AS_MULTI = 'multisig_as_multi',
  MULTISIG_APPROVE_AS_MULTI = 'multisig_approve_as_multi',
  MULTISIG_CANCEL_AS_MULTI = 'cancel_as_multi',

  XCM_LIMITED_TRANSFER = 'xcm_limited_reserve_transfer_assets',
  XCM_TELEPORT = 'xcm_limited_teleport_assets',
  POLKADOT_XCM_LIMITED_TRANSFER = 'polkadotxcm_limited_reserve_transfer_assets',
  POLKADOT_XCM_TELEPORT = 'polkadotxcm_limited_teleport_assets',
  XTOKENS_TRANSFER_MULTIASSET = 'xtokens_transfer_multiasset',

  BOND = 'bond',
  STAKE_MORE = 'bondExtra',
  UNSTAKE = 'unbond',
  RESTAKE = 'rebond',
  REDEEM = 'withdrawUnbonded',
  NOMINATE = 'nominate',
  BATCH_ALL = 'batchAll',
  DESTINATION = 'payee',
  CHILL = 'chill',

  ADD_PROXY = 'add_proxy',
  REMOVE_PROXY = 'remove_proxy',
  PROXY = 'proxy',
  CREATE_PURE_PROXY = 'create_pure_proxy',
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
  chainId: ChainId;
  address: Address;
  type: TransactionType;
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
