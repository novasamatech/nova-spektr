import { type DecodedXcmPayload } from '@/shared/api/xcm';
import { type Address, type Conviction, type HexString, type ProxyType, type Timepoint } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyDecodedTransaction, type DecodedTransaction, type EncodedTransaction } from '@/domains/network';
import { type TransactionVote } from '@/entities/governance';

// system

export type RemarkTransaction = DecodedTransaction<{
  remark: string;
}>;
export function isRemarkTransaction(t: AnyDecodedTransaction): t is KillPureProxyTransaction {
  return t.section === 'system' && t.method === 'remark';
}

// transfer

export type TransferTransaction = DecodedTransaction<{
  dest: Address;
  value: string;
}>;
export function isTransferTransaction(t: AnyDecodedTransaction): t is TransferTransaction {
  return t.section === 'balances' && ['transferKeepAlive', 'transfer', 'transferAll'].includes(t.method);
}

export type AssetTransferTransaction = DecodedTransaction<DecodedXcmPayload>;
export function isAssetTransferTransaction(t: AnyDecodedTransaction): t is AssetTransferTransaction {
  return ['assets', 'currencies'].includes(t.section) && t.method === 'transfer';
}

export type XcmTransferTransaction = DecodedTransaction<DecodedXcmPayload>;
export function isXcmTransferTranasction(t: AnyDecodedTransaction): t is XcmTransferTransaction {
  return (
    (t.section === 'xcmPallet' && ['limitedReserveTransferAssets', 'limitedTeleportAssets'].includes(t.method)) ||
    (t.section === 'polkadotXcm' &&
      ['limitedReserveTransferAssets', 'limitedTeleportAssets', 'transferAssets'].includes(t.method))
  );
}

export type MultiAssetTransferTransaction = DecodedTransaction<DecodedXcmPayload>;
export function isMultiAssetTransferTranasction(t: AnyDecodedTransaction): t is MultiAssetTransferTransaction {
  return t.section === 'xTokens' && t.method === 'transferMultiasset';
}

// multisig

export type MultisigApproveTransaction = DecodedTransaction<{
  threshold: number;
  otherSignatories: Address[];
  // TODO get type
  maybeTimepoint: Timepoint | null;
  callHash: HexString;
  maxWeight: unknown;
}>;
export function isMultisigApproveTransaction(t: AnyDecodedTransaction): t is StakingBondTransaction {
  return t.section === 'multisig' && t.method === 'cancelAsMulti';
}

export type MultisigCancelTransaction = DecodedTransaction<{
  threshold: number;
  otherSignatories: Address[];
  maybeTimepoint: Timepoint;
  callHash: HexString;
}>;
export function isMultisigCancelTransaction(t: AnyDecodedTransaction): t is StakingBondTransaction {
  return t.section === 'multisig' && t.method === 'approveAsMulti';
}

// staking

export type StakingBondTransaction = DecodedTransaction<{
  controller: unknown;
  value: string;
  payee: unknown;
}>;
export function isStakingBondTransaction(t: AnyDecodedTransaction): t is StakingBondTransaction {
  return t.section === 'staking' && t.method === 'bond';
}

export type StakingUnbondTransaction = DecodedTransaction<{
  value: string;
}>;
export function isStakingUnbondTransaction(t: AnyDecodedTransaction): t is StakingUnbondTransaction {
  return t.section === 'staking' && t.method === 'unbond';
}

export type StakingBondExtraTransaction = DecodedTransaction<{
  maxAdditional: unknown;
}>;
export function isStakingBondExtraTransaction(t: AnyDecodedTransaction): t is StakingBondExtraTransaction {
  return t.section === 'staking' && t.method === 'bondExtra';
}

export type StakingRebondTransaction = DecodedTransaction<{
  value: string;
}>;
export function isStakingRebondTransaction(t: AnyDecodedTransaction): t is StakingRebondTransaction {
  return t.section === 'staking' && t.method === 'rebond';
}

export type StakingWithdrawUnbondedTransaction = DecodedTransaction<{
  numSlashingSpans: number;
}>;
export function isStakingWithdrawUnbondedTransaction(
  t: AnyDecodedTransaction,
): t is StakingWithdrawUnbondedTransaction {
  return t.section === 'staking' && t.method === 'withdrawUnbonded';
}

export type StakingNominateTransaction = DecodedTransaction<{
  targets: Address[];
}>;
export function isStakingNominateTransaction(t: AnyDecodedTransaction): t is StakingNominateTransaction {
  return t.section === 'staking' && t.method === 'nominate';
}

export type StakingSetPayeeTransaction = DecodedTransaction<{
  payee: unknown;
}>;
export function isStakingSetPayeeTransaction(t: AnyDecodedTransaction): t is StakingSetPayeeTransaction {
  return t.section === 'staking' && t.method === 'setPayee';
}

export type StakingChillTransaction = DecodedTransaction<never>;
export function isStakingChillTransaction(t: AnyDecodedTransaction): t is StakingChillTransaction {
  return t.section === 'staking' && t.method === 'chill';
}

// proxy

export type ProxyProxyTransaction = DecodedTransaction<{
  real: AccountId;
  forceProxyType: ProxyType | '';
  call: EncodedTransaction;
}>;
export function isProxyProxyTransaction(t: AnyDecodedTransaction): t is ProxyProxyTransaction {
  return t.section === 'proxy' && t.method === 'proxy';
}

export type AddProxyTransaction = DecodedTransaction<{
  delegate: Address;
  proxyType: ProxyType;
  delay: number;
}>;
export function isAddProxyTransaction(t: AnyDecodedTransaction): t is AddProxyTransaction {
  return t.section === 'proxy' && t.method === 'addProxy';
}

export type RemoveProxyTransaction = DecodedTransaction<{
  delegate: Address;
  proxyType: ProxyType;
  delay: number;
}>;
export function isRemoveProxyTransaction(t: AnyDecodedTransaction): t is RemoveProxyTransaction {
  return t.section === 'proxy' && t.method === 'removeProxy';
}

export type CreatePureProxyTransaction = DecodedTransaction<{
  proxyType: ProxyType;
  delay: number;
  index: number;
}>;
export function isCreatePureProxyTransaction(t: AnyDecodedTransaction): t is CreatePureProxyTransaction {
  return t.section === 'proxy' && t.method === 'createPure';
}

export type KillPureProxyTransaction = DecodedTransaction<{
  spawner: AccountId;
  proxyType: ProxyType;
  index: number;
  height: number;
  extIndex: number;
}>;
export function isKillPureProxyTransaction(t: AnyDecodedTransaction): t is KillPureProxyTransaction {
  return t.section === 'proxy' && t.method === 'killPure';
}

// voting

export type ConvictionVotingVoteTransaction = DecodedTransaction<{
  referendum: number;
  vote: TransactionVote;
}>;
export function isConvictionVotingVoteTransaction(t: AnyDecodedTransaction): t is ConvictionVotingVoteTransaction {
  return t.section === 'convictionVoting' && t.method === 'vote';
}

export type ConvictionVotingRemoveVoteTransaction = DecodedTransaction<{
  track: number;
  referendum: number;
}>;
export function isConvictionVotingRemoveVoteTransaction(
  t: AnyDecodedTransaction,
): t is ConvictionVotingRemoveVoteTransaction {
  return t.section === 'convictionVoting' && t.method === 'removeVote';
}

export type ConvictionVotingUnlockTransaction = DecodedTransaction<{
  target: Address;
  trackId: number;
}>;
export function isConvictionVotingUnlockTransaction(t: AnyDecodedTransaction): t is ConvictionVotingUnlockTransaction {
  return t.section === 'convictionVoting' && t.method === 'unlock';
}

export type ConvictionVotingDelegateTransaction = DecodedTransaction<{
  track: string;
  target: AccountId;
  conviction: Conviction;
  balance: string;
}>;
export function isConvictionVotingDelegateTransaction(
  t: AnyDecodedTransaction,
): t is ConvictionVotingDelegateTransaction {
  return t.section === 'convictionVoting' && t.method === 'delegate';
}

export type ConvictionVotingUndelegateTransaction = DecodedTransaction<{
  track: number;
}>;
export function isConvictionVotingUndelegateTransaction(
  t: AnyDecodedTransaction,
): t is ConvictionVotingUndelegateTransaction {
  return t.section === 'convictionVoting' && t.method === 'undelegate';
}

// fellowship

export type FellowshipCollectiveVoteTransaction = DecodedTransaction<{
  poll: number;
  aye: boolean;
}>;
export function isFellowshipCollectiveVoteTransaction(
  t: AnyDecodedTransaction,
): t is ConvictionVotingUndelegateTransaction {
  return t.section === 'fellowshipCollective' && t.method === 'vote';
}

export type FellowshipCoreSetActiveTransaction = DecodedTransaction<{
  isActive: boolean;
}>;
export function isFellowshipCoreSetActiveTransaction(
  t: AnyDecodedTransaction,
): t is FellowshipCoreSetActiveTransaction {
  return t.section === 'fellowshipCore' && t.method === 'setActive';
}

export type FellowshipCoreSubmitEvidenceTransaction = DecodedTransaction<{
  wish: 'Promotion' | 'Retention';
  evidence: HexString;
}>;
export function isFellowshipCoreSubmitEvidenceTransaction(
  t: AnyDecodedTransaction,
): t is FellowshipCoreSubmitEvidenceTransaction {
  return t.section === 'fellowshipCore' && t.method === 'submitEvidence';
}

export type FellowshipSalaryInductTransaction = DecodedTransaction<never>;
export function isFellowshipSalaryInductTransaction(
  t: AnyDecodedTransaction,
): t is FellowshipCoreSubmitEvidenceTransaction {
  return t.section === 'fellowshipSalary' && t.method === 'induct';
}

export type FellowshipSalaryRegisterTransaction = DecodedTransaction<never>;
export function isFellowshipSalaryRegisterTransaction(
  t: AnyDecodedTransaction,
): t is FellowshipSalaryRegisterTransaction {
  return t.section === 'fellowshipSalary' && t.method === 'register';
}

export type FellowshipSalaryPayoutTransaction = DecodedTransaction<never>;
export function isFellowshipSalaryPayoutTransaction(t: AnyDecodedTransaction): t is FellowshipSalaryPayoutTransaction {
  return t.section === 'fellowshipSalary' && t.method === 'payout';
}

export type FellowshipSalaryPayoutOtherTransaction = DecodedTransaction<{
  beneficiary: Address;
}>;
export function isFellowshipSalaryPayoutOtherTransaction(
  t: AnyDecodedTransaction,
): t is FellowshipSalaryPayoutOtherTransaction {
  return t.section === 'fellowshipSalary' && t.method === 'payoutOther';
}
