import { type ApiPromise } from '@polkadot/api';
import { type u32 } from '@polkadot/types';
import { type SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { BN, BN_TWO, bnMin, hexToU8a, isHex, numberToU8a, u8aToHex, u8aToNumber } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

import {
  type BlockHeight,
  type CallData,
  type CallHash,
  type Chain,
  type HexString,
  type ProxyType,
} from '@/shared/core';
import { assert } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { toAddress } from './address';
import { DEFAULT_TIME, MORTALITY_PERIOD_MS, ONE_DAY, THRESHOLD } from './constants';

export type TxMetadata = {
  signerPayloadBase: Omit<SignerPayloadJSON, 'method' | 'version' | 'era'>;
  mortalLength: number;
  blockTimeMs: number;
  blockNumber: number;
};

const SUPPORTED_VERSIONS = ['V2', 'V3', 'V4'];
const UNUSED_LABEL = 'unused';

export const getMortalitySeconds = (mortalLength: number, blockTimeMs: number): number => {
  return Math.floor((mortalLength * blockTimeMs) / 1000);
};

/**
 * Check if a mortal era has expired, replicating Substrate's
 * `MortalEra::birth()` / `death()` logic from
 * `frame/system/src/extensions/check_mortality.rs`.
 */
export const isEraExpired = (currentBlock: number, eraBlockNumber: number, period: number): boolean => {
  const phase = eraBlockNumber % period;
  const birth = Math.floor((Math.max(eraBlockNumber, phase) - phase) / period) * period + phase;
  const death = birth + period;

  return currentBlock >= death;
};

/**
 * Compose part of SignerPayloadJSON for
 */
export const createTxMetadata = async (
  accountId: AccountId,
  api: ApiPromise,
  blockTimeMs?: number,
  chain?: Chain, // optional because blockTimeMs takes precedence when provided
): Promise<TxMetadata> => {
  const chainId = api.genesisHash.toHex();
  const { header, nonce } = await api.derive.tx.signingInfo(accountId);
  assert(header);

  const effectiveBlockTimeMs = blockTimeMs ?? (chain ? getExpectedBlockTime(api, chain).toNumber() : undefined);
  if (!effectiveBlockTimeMs) {
    throw new Error('Either blockTimeMs or chain must be provided to createTxMetadata');
  }
  const mortalLength = Math.ceil(MORTALITY_PERIOD_MS / effectiveBlockTimeMs);

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

  return {
    signerPayloadBase,
    mortalLength,
    blockTimeMs: effectiveBlockTimeMs,
    blockNumber: header.number.toNumber(),
  };
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
  const parachainId = await api.query.parachainInfo?.parachainId?.();

  return (parachainId as u32).toNumber();
}

export const getExpectedBlockTime = (api: ApiPromise, chain: Chain): BN => {
  if (chain.additional?.defaultBlockTime) {
    return new BN(chain.additional.defaultBlockTime);
  }

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

export const getCreatedDateFromApi = async (
  neededBlock: BlockHeight,
  api: ApiPromise,
  chain: Chain,
): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api, chain);

  return getCreatedDate(neededBlock, currentBlock, blockTime.toNumber());
};

export const getTimeToBlock = async (neededBlock: BlockHeight, api: ApiPromise, chain: Chain): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api, chain);

  return (neededBlock - currentBlock) * blockTime.toNumber();
};

export const getRelativeTimeFromApi = async (
  neededBlock: BlockHeight,
  api: ApiPromise,
  chain: Chain,
): Promise<number> => {
  const blockTime = getExpectedBlockTime(api, chain);

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
export const getBlockTimeAgo = async (neededTime: number, api: ApiPromise, chain: Chain): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api, chain);

  const completedBlocks = Math.ceil(neededTime / blockTime.toNumber());

  return Math.max(0, currentBlock - completedBlocks);
};

export const getBlockFromTime = async (neededTime: number, api: ApiPromise, chain: Chain): Promise<number> => {
  const timestampMs = new Date(neededTime).getTime();
  const currentTime = Date.now();
  const time = currentTime - timestampMs;

  return getBlockTimeAgo(time, api, chain);
};

export const getTypeVersion = (api: ApiPromise, typeName: string): string => {
  const enumValues = getTypeEnumValues(api, typeName);
  const supportedVersions = enumValues.filter((value) => SUPPORTED_VERSIONS.includes(value));

  return supportedVersions.at(-1) || '';
};

export const getProxyTypes = (api: ApiPromise): ProxyType[] => {
  const type = api.tx.proxy.addProxy.meta.args[1]?.type.toString() ?? '';

  return getTypeEnumValues<ProxyType>(api, type).filter((value) => {
    const isUnused = value.toLowerCase().includes(UNUSED_LABEL);

    return !isUnused;
  });
};

export const getTypeEnumValues = <T extends string>(api: ApiPromise, typeName: string): T[] => {
  // @ts-expect-error TODO fix
  return api.createType(typeName).defKeys;
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
