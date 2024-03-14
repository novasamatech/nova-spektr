import { ApiPromise } from '@polkadot/api';
import { BaseTxInfo, getRegistry, GetRegistryOpts, OptionsWithMeta, TypeRegistry } from '@substrate/txwrapper-polkadot';
import { isHex, hexToU8a, bnMin, BN_TWO, BN } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { u32 } from '@polkadot/types';

import { Address, CallData, CallHash, XcmPallets, ProxyType } from '@shared/core';
import { XcmTransferType } from '../../api/xcm';
import { DEFAULT_TIME, ONE_DAY, THRESHOLD } from './constants';

const V3_LABEL = 'V3';
const UNUSED_LABEL = 'unused';

/**
 * Compose and return all the data needed for @substrate/txwrapper-polkadot signing
 * @param accountId account identification
 * @param api polkadot connector
 */
export const createTxMetadata = async (
  accountId: Address,
  api: ApiPromise,
): Promise<{ registry: TypeRegistry; options: OptionsWithMeta; info: BaseTxInfo }> => {
  const [{ block }, blockHash, genesisHash, metadataRpc, nonce, { specVersion, transactionVersion, specName }] =
    await Promise.all([
      api.rpc.chain.getBlock(),
      api.rpc.chain.getBlockHash(),
      api.rpc.chain.getBlockHash(0),
      api.rpc.state.getMetadata(),
      api.rpc.system.accountNextIndex(accountId),
      api.rpc.state.getRuntimeVersion(),
    ]);

  const registry = getRegistry({
    chainName: specName.toString() as GetRegistryOpts['specName'],
    specName: specName.toString() as GetRegistryOpts['specName'],
    specVersion: specVersion.toNumber(),
    metadataRpc: metadataRpc.toHex(),
  });

  const info: BaseTxInfo = {
    address: accountId,
    blockHash: blockHash.toString(),
    blockNumber: block.header.number.toNumber(),
    genesisHash: genesisHash.toString(),
    metadataRpc: metadataRpc.toHex(),
    nonce: nonce.toNumber(),
    specVersion: specVersion.toNumber(),
    transactionVersion: transactionVersion.toNumber(),
    eraPeriod: 64,
    tip: 0,
  };

  const options: OptionsWithMeta = {
    metadataRpc: metadataRpc.toHex(),
    registry,
    signedExtensions: registry.signedExtensions,
  };

  return { options, info, registry };
};

/**
 * Check that callData correctly resembles callHash
 * @param callHash callHash value
 * @param callData callData value
 * @return {Boolean}
 */
export const validateCallData = <T extends string = CallData, K extends string = CallHash>(
  callData: T,
  callHash: K,
): boolean => {
  return isHex(callData) && callHash === blake2AsHex(hexToU8a(callData));
};

export const getCurrentBlockNumber = async (api: ApiPromise): Promise<number> => {
  const { block } = await api.rpc.chain.getBlock();

  return block.header.number.toNumber();
};

export async function getParachainId(api: ApiPromise): Promise<number> {
  const parachainId = (await api.query.parachainInfo.parachainId()) as unknown as u32;

  return parachainId.toNumber();
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

export const getCreatedDate = (neededBlock: number, currentBlock: number, blockTime: number): number => {
  return Date.now() - (currentBlock - neededBlock) * blockTime;
};

export const getCreatedDateFromApi = async (neededBlock: number, api: ApiPromise): Promise<number> => {
  const currentBlock = await getCurrentBlockNumber(api);
  const blockTime = getExpectedBlockTime(api);

  return getCreatedDate(neededBlock, currentBlock, blockTime.toNumber());
};

export const getTypeVersion = (api: ApiPromise, typeName: string): string => {
  return (
    getTypeEnumValues(api, typeName)
      .filter((value) => {
        const isV3 = value === V3_LABEL;
        const isUnused = value.toLowerCase().includes(UNUSED_LABEL);

        return !isV3 && !isUnused;
      })
      .pop() || ''
  );
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
  // @ts-ignore
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
