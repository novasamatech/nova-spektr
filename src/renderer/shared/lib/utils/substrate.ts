import { type ApiPromise } from '@polkadot/api';
import { type u32 } from '@polkadot/types';
import { type SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { type BN, BN_TWO, bnMin, hexToU8a, isHex, numberToU8a, u8aToHex, u8aToNumber } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

import { XcmTransferType } from '@/shared/api/xcm';
import {
  type BlockHeight,
  type CallData,
  type CallHash,
  type HexString,
  type ProxyType,
  XcmPallets,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { toAddress } from './address';
import { DEFAULT_TIME, ONE_DAY, THRESHOLD } from './constants';

export type TxMetadata = {
  signerPayloadBase: Omit<SignerPayloadJSON, 'method' | 'version' | 'era'>;
};

const SUPPORTED_VERSIONS = ['V2', 'V3', 'V4'];
const UNUSED_LABEL = 'unused';

/**
 * Compose part of SignerPayloadJSON for
 */
export const createTxMetadata = async (accountId: AccountId, api: ApiPromise): Promise<TxMetadata> => {
  const chainId = api.genesisHash.toHex();
  const [header, nonce] = await Promise.all([api.rpc.chain.getHeader(), api.rpc.system.accountNextIndex(accountId)]);

  const signerPayloadBase: Omit<SignerPayloadJSON, 'method' | 'version' | 'era'> = {
    address: toAddress(accountId, { prefix: api.consts.system.ss58Prefix.toNumber() }),
    blockHash: header.hash.toHex(),
    blockNumber: header.number.toHex(),
    genesisHash: chainId,
    nonce: nonce.toHex(),
    specVersion: api.runtimeVersion.specVersion.toHex(),
    transactionVersion: api.runtimeVersion.transactionVersion.toHex(),
    tip: numberToScaleEncoded(0),
    signedExtensions: api.registry.signedExtensions,
  };

  return { signerPayloadBase };
};

export const getCallHash = (callData: HexString) => blake2AsHex(hexToU8a(callData));

/**
 * Check that callData correctly resembles callHash
 *
 * @param callHash CallHash value
 * @param callData CallData value
 *
 * @returns {Boolean}
 */
export const validateCallData = <T extends string = CallData, K extends string = CallHash>(
  callData: T,
  callHash: K,
): boolean => {
  return isHex(callData) && callHash === getCallHash(callData);
};

export const getCurrentBlockNumber = async (api: ApiPromise): Promise<BlockHeight> => {
  const { block } = await api.rpc.chain.getBlock();

  return block.header.number.toNumber();
};

export const getCurrentBlockHash = async (api: ApiPromise): Promise<HexString> => {
  const { block } = await api.rpc.chain.getBlock();

  return block.header.hash.toHex();
};

export async function getParachainId(api: ApiPromise): Promise<number> {
  const parachainId = await api.query.parachainInfo.parachainId();

  return (parachainId as u32).toNumber();
}

export const getExpectedBlockTime = (api: ApiPromise): BN => {
  const substrateBlockTime = api.consts.babe?.expectedBlockTime || api.consts.aura?.slotDuration;

  const blockTime = substrateBlockTime;
  if (blockTime) {
    return bnMin(ONE_DAY, blockTime);
  }

  const thresholdCheck = api.consts.timestamp?.minimumPeriod.gte(THRESHOLD);
  if (thresholdCheck) {
    return bnMin(ONE_DAY, api.consts.timestamp.minimumPeriod.mul(BN_TWO));
  }

  // default guess for a parachain
  if (api.query.parachainSystem) {
    return bnMin(ONE_DAY, DEFAULT_TIME.mul(BN_TWO));
  }

  // default guess for others
  return bnMin(ONE_DAY, DEFAULT_TIME);
};

export const getCreatedDate = (neededBlock: BlockHeight, currentBlock: BlockHeight, blockTime: number): number => {
  return Date.now() + (neededBlock - currentBlock) * blockTime;
};

export const getCreatedDateFromApi = async (neededBlock: BlockHeight, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  return getCreatedDate(neededBlock, currentBlock, blockTime.toNumber());
};

export const getTimeToBlock = async (neededBlock: BlockHeight, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  return (neededBlock - currentBlock) * blockTime.toNumber();
};

export const getRelativeTimeFromApi = async (neededBlock: BlockHeight, api: ApiPromise): Promise<number> => {
  const blockTime = getExpectedBlockTime(api);

  return neededBlock * blockTime.toNumber();
};

/**
 * Get the block number that completed the specified time period ago
 *
 * @param neededTime - The time period in milliseconds.
 * @param api - The Polkadot API instance.
 *
 * @returns A promise that resolves to the block number.
 */
export const getBlockTimeAgo = async (neededTime: number, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  const completedBlocks = Math.ceil(neededTime / blockTime.toNumber());

  return Math.max(0, currentBlock - completedBlocks);
};

export const getBlockFromTime = async (neededTime: number, api: ApiPromise): Promise<number> => {
  const timestampMs = new Date(neededTime).getTime();
  const currentTime = Date.now();
  const time = currentTime - timestampMs;

  return getBlockTimeAgo(time, api);
};

export const getTypeVersion = (api: ApiPromise, typeName: string): string => {
  const enumValues = getTypeEnumValues(api, typeName);
  const supportedVersions = enumValues.filter((value) => SUPPORTED_VERSIONS.includes(value));

  return supportedVersions.at(-1) || '';
};

export const getProxyTypes = (api: ApiPromise): ProxyType[] => {
  const type = api.tx.proxy.addProxy.meta.args[1].type.toString();

  return getTypeEnumValues<ProxyType>(api, type).filter((value) => {
    const isUnused = value.toLowerCase().includes(UNUSED_LABEL);

    return !isUnused;
  });
};

export const getTypeEnumValues = <T extends string>(api: ApiPromise, typeName: string): T[] => {
  // @ts-expect-error TODO fix
  return api.createType(typeName).defKeys;
};

export const getTypeName = (api: ApiPromise, transferType: XcmTransferType, paramName: string): string | undefined => {
  const { pallet, call } = getPalletAndCallByXcmTransferType(api, transferType);

  const param = api.tx[pallet][call].meta.args.find((n) => n.name.toString() === paramName);

  if (param) {
    return param.type.toString();
  }
};

export const getPalletAndCallByXcmTransferType = (
  api: ApiPromise,
  transferType: XcmTransferType,
): { pallet: XcmPallets; call: string } => {
  if (transferType === XcmTransferType.XTOKENS) {
    return { pallet: XcmPallets.XTOKENS, call: 'transferMultiasset' };
  }

  const pallet = api.tx.xcmPallet ? XcmPallets.XCM_PALLET : XcmPallets.POLKADOT_XCM;

  if (transferType === XcmTransferType.XCMPALLET) {
    return { pallet, call: 'limitedReserveTransferAssets' };
  }

  if (transferType === XcmTransferType.XCMPALLET_TELEPORT) {
    return { pallet, call: 'limitedTeleportAssets' };
  }

  if (transferType === XcmTransferType.XCMPALLET_TRANSFER_ASSETS) {
    return { pallet, call: 'transferAssets' };
  }

  // Should never be reached as all transferType cases are covered
  throw new Error('Invalid transferType');
};

export const upgradeNonce = (metadata: TxMetadata, index: number): TxMetadata => {
  return {
    ...metadata,
    signerPayloadBase: {
      ...metadata.signerPayloadBase,
      nonce: numberToScaleEncoded(parseInt(metadata.signerPayloadBase.nonce) + index),
    },
  };
};

export const getSecondsDurationToBlock = (timeToBlock: number): number => {
  const currentTime = Date.now();
  const time = timeToBlock - currentTime;

  return Math.floor(time / 1000);
};

export const numberToScaleEncoded = (value: number) => u8aToHex(numberToU8a(value));

export const scaleEncodedToNumber = (value: string) => u8aToNumber(hexToU8a(value));
