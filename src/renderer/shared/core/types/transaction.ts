import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

import { type MultisigAccount, type ProxiedAccount } from './account';
import { type ChainId } from './general';
import { type PartialBy } from './utility';

export const enum TransactionType {
  TRANSFER = 'transfer',
  TRANSFER_ALL = 'transfer_all',
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
  KILL_PURE_PROXY = 'kill_pure_proxy',

  REMARK = 'remark',

  REMARK_WITH_EVENT = 'remark_with_event',

  UNLOCK = 'unlock',
  VOTE = 'vote',
  REMOVE_VOTE = 'remove_vote',
  DELEGATE = 'delegate',
  UNDELEGATE = 'undelegate',
  EDIT_DELEGATION = 'edit_delegation',

  COLLECTIVE_VOTE = 'collective_vote',
  COLLECTIVE_SET_ACTIVE = 'collective_core_set_active',
  COLLECTIVE_SALARY_INDUCT = 'collective_salary_induct',
  COLLECTIVE_SALARY_REQUEST = 'collective_salary_request',
  COLLECTIVE_SALARY_PAYOUT = 'collective_salary_payout',
  COLLECTIVE_SUBMIT_EVIDENCE = 'collective_submit_evidence',
  COLLECTIVE_EVIDENCE_VOTE = 'collective_evidence_vote',
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
  accountId: AccountId;
  type: TransactionType;
  args: Args;
};

// TODO: use it for decoding only
export type DecodedTransaction = PartialBy<Transaction, 'type'> & {
  method: string;
  section: string;
};

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

export type ProxyTransaction = {
  accountId: AccountId;
  chainId: ChainId;
  call: string;
  forceProxyType: string;
  real: AccountId;
  transaction?: Transaction | DecodedTransaction;
};
