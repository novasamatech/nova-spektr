import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

import { type MultisigAccount, type ProxiedAccount } from './account';
import { type Address, type CallData, type CallHash, type ChainId, type HexString } from './general';
import { type Signatory } from './signatory';
import { type PartialBy } from './utility';

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
  POLKADOT_XCM_TRANSFER_ASSETS = 'polkadotxcm_transfer_assets',
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
  REMOVE_PURE_PROXY = 'kill_pure_proxy',

  REMARK = 'remark',

  UNLOCK = 'unlock',
  VOTE = 'vote',
  REVOTE = 'revote',
  REMOVE_VOTE = 'remove_vote',
  DELEGATE = 'delegate',
  UNDELEGATE = 'undelegate',
  EDIT_DELEGATION = 'edit_delegation',

  COLLECTIVE_VOTE = 'collective_vote',
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
export type Transaction<Args extends NonNullable<unknown> = Record<string, any>> = {
  chainId: ChainId;
  address: Address;
  type: TransactionType;
  args: Args;
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
  blockCreated: number;
  indexCreated: number;
  dateCreated?: number;
  transaction?: Transaction | DecodedTransaction;
};

export type FlexibleMultisigTransaction = MultisigTransaction & {
  proxiedAccountId: AccountId;
};

export type MultisigTransactionKey = Pick<
  MultisigTransaction,
  'accountId' | 'callHash' | 'chainId' | 'indexCreated' | 'blockCreated'
>;

export const enum WrapperKind {
  MULTISIG = 'multisig',
  PROXY = 'proxy',
}

export type MultisigTxWrapper = {
  kind: WrapperKind.MULTISIG;
  multisigAccount: MultisigAccount;
  signatories: AnyAccount[];
  signer: AnyAccount;
};

export type ProxyTxWrapper = {
  kind: WrapperKind.PROXY;
  proxyAccount: AnyAccount;
  proxiedAccount: ProxiedAccount;
};

export type TxWrapper = MultisigTxWrapper | ProxyTxWrapper;

export type WrapAsMulti = {
  account: MultisigAccount;
  signatoryId: AccountId;
};

export type TxWrappers_OLD = WrapAsMulti;
