import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Header, type Index, type Weight } from '@polkadot/types/interfaces';
import { type AnyJson } from '@polkadot/types/types';
import { type Args } from '@substrate/txwrapper-polkadot';

import {
  type Address,
  type CallData,
  type DecodedTransaction,
  type HexString,
  type Timepoint,
  type Transaction,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

// =====================================================
// =========== ITransactionService interface ===========
// =====================================================

export type ITransactionService = {
  getExtrinsicWeight: (extrinsic: SubmittableExtrinsic<'promise'>) => Promise<Weight>;
  getTxWeight: (transaction: Transaction, api: ApiPromise) => Promise<Weight>;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: Uint8Array, signature: HexString, accountId: AccountId) => boolean;
};

// =====================================================
// ============= ICallDataDecoder interface ============
// =====================================================

export type ICallDataDecoder = {
  decodeCallData: (api: ApiPromise, address: Address, callData: CallData) => DecodedTransaction;
  getTxFromCallData: (api: ApiPromise, callData: CallData) => SubmittableExtrinsic<'promise'>;
};

// =====================================================
// ======================= General =====================
// =====================================================

export type HashData = {
  callData: HexString;
  callHash: HexString;
};

export type ExtrinsicResultParams = {
  timepoint: Timepoint;
  extrinsicHash: HexString;
  isFinalApprove: boolean;
  multisigError: string;
};

export type XcmPallet = 'xcmPallet' | 'polkadotXcm';

export interface XcmPalletTransferArgs extends Args {
  dest: AnyJson;
  beneficiary: AnyJson;
  assets: AnyJson;
  feeAssetItem: number;
  weightLimit: AnyJson;
}

export interface XTokenPalletTransferArgs extends Args {
  asset: AnyJson;
  dest: AnyJson;
  destWeightLimit?: AnyJson;
  destWeight?: number;
}

export type ExtraSignerOptions = { header: Header | null; mortalLength: number; nonce: Index };
