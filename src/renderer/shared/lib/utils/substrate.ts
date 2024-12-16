import { type ApiPromise } from '@polkadot/api';
import { type u32 } from '@polkadot/types';
import { type BN, BN_TWO, bnMin, hexToU8a, isHex } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import {
  type BaseTxInfo,
  type GetRegistryOpts,
  type OptionsWithMeta,
  type TypeRegistry,
  getRegistry,
} from '@substrate/txwrapper-polkadot';

import { XcmTransferType } from '@/shared/api/xcm';
import { EXTENSIONS } from '@/shared/config/extensions';
import {
  type Address,
  type BlockHeight,
  type CallData,
  type CallHash,
  type ChainId,
  type HexString,
  type ProxyType,
  XcmPallets,
} from '@/shared/core';

import { DEFAULT_TIME, ONE_DAY, THRESHOLD } from './constants';

export type TxMetadata = { registry: TypeRegistry; options: OptionsWithMeta; info: BaseTxInfo };

const SUPPORTED_VERSIONS = ['V3', 'V4'];
const UNUSED_LABEL = 'unused';

/**
 * Compose and return all the data needed for
 *
 * @param address Account address
 * @param api Polkadot connector
 *
 * @substrate/txwrapper-polkadot signing
 */
export const createTxMetadata = async (address: Address, api: ApiPromise): Promise<TxMetadata> => {
  const chainId = api.genesisHash.toString() as ChainId;

  const [header, blockHash, metadataRpc, nonce, { specVersion, transactionVersion, specName }] = await Promise.all([
    api.rpc.chain.getHeader(),
    api.rpc.chain.getBlockHash(),
    api.rpc.state.getMetadata(),
    api.rpc.system.accountNextIndex(address),
    api.rpc.state.getRuntimeVersion(),
  ]);

  const registry = getRegistry({
    chainName: specName.toString() as GetRegistryOpts['chainName'],
    specName: specName.toString() as GetRegistryOpts['specName'],
    specVersion: specVersion.toNumber(),
    metadataRpc: metadataRpc.toHex(),
    ...EXTENSIONS[chainId]?.txwrapper,
  });

  const info: BaseTxInfo = {
    address,
    blockHash: blockHash.toString(),
    blockNumber: header.number.toNumber(),
    genesisHash: chainId,
    metadataRpc: metadataRpc.toHex(),
    nonce: nonce.toNumber(),
    specVersion: specVersion.toNumber(),
    transactionVersion: transactionVersion.toNumber(),
    eraPeriod: 64,
    tip: 0,
  };

  const options: OptionsWithMeta = {
    registry,
    metadataRpc: metadataRpc.toHex(),
    signedExtensions: registry.signedExtensions,
    userExtensions: EXTENSIONS[chainId]?.txwrapper?.userExtensions,
  };

  return { options, info, registry };
};

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
  return isHex(callData) && callHash === blake2AsHex(hexToU8a(callData));
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
  const substrateBlockTime = api.consts.babe?.expectedBlockTime;
  const proofOfWorkBlockTime = api.consts.difficulty?.targetBlockTime;
  const subspaceBlockTime = api.consts.subspace?.expectedBlockTime;

  const blockTime = substrateBlockTime || proofOfWorkBlockTime || subspaceBlockTime;
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

export const getCreatedDate = (neededBlock: BlockHeight, currentBlock: number, blockTime: number): number => {
  return Date.now() - (currentBlock - neededBlock) * blockTime;
};

export const getCreatedDateFromApi = async (neededBlock: BlockHeight, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  return getCreatedDate(neededBlock, currentBlock, blockTime.toNumber());
};

export const getTimeToBlock = async (neededBlock: BlockHeight, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  return Math.abs(neededBlock - currentBlock) * blockTime.toNumber();
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

export const getTypeVersion = (api: ApiPromise, typeName: string): string => {
  const enumValues = getTypeEnumValues(api, typeName);
  const supportedVersions = enumValues.filter((value) => SUPPORTED_VERSIONS.includes(value));

  return supportedVersions.pop() || '';
};

export const getProxyTypes = (api: ApiPromise): ProxyType[] => {
  const type = api.tx.proxy.addProxy.meta.args[1].type.toString();
  const excludedTypes = ['SudoBalances'];

  return getTypeEnumValues<ProxyType>(api, type).filter((value) => {
    const isUnused = value.toLowerCase().includes(UNUSED_LABEL);

    return !isUnused && !excludedTypes.includes(value);
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

  // Should never be reached as all transferType cases are covered
  throw new Error('Invalid transferType');
};

export const upgradeNonce = (metadata: TxMetadata, index: number): TxMetadata => {
  return {
    ...metadata,
    info: {
      ...metadata.info,
      nonce: Number(metadata.info.nonce) + Number(index),
    },
  };
};

export const getSecondsDurationToBlock = (timeToBlock: number): number => {
  const currentTime = Date.now();
  const time = timeToBlock - currentTime;

  return Math.floor(time / 1000);
};
