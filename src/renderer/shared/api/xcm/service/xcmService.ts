import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN, BN_TEN } from '@polkadot/util';
import { camelCase, get } from 'lodash';

import { type AccountId, type Chain, type ChainId, type HexString } from '@/shared/core';
import { getAssetId, getTypeName, getTypeVersion, toLocalChainId } from '@/shared/lib/utils';
import { type XTokenPalletTransferArgs, type XcmPalletTransferArgs } from '@/entities/transaction';
import { localStorageService } from '../../local-storage';
import { chainsService } from '../../network';
import { FACTOR_MULTIPLIER, SET_TOPIC_SIZE, XCM_KEY, XCM_URL } from '../lib/constants';
import {
  type AssetLocation,
  type AssetName,
  type AssetXCM,
  type ChainXCM,
  type PathType,
  type XcmConfig,
  type XcmTransfer,
  type XcmTransferType,
} from '../lib/types';
import { xcmUtils } from '../lib/xcm-utils';

export const xcmService = {
  fetchXcmConfig,
  getXcmConfig,
  saveXcmConfig,

  getAvailableTransfers,
  getEstimatedFee,
  getEstimatedRequiredDestWeight,
  getDeliveryFeeFromConfig,

  getAssetLocation,
  getVersionedDestinationLocation,
  getVersionedAccountLocation,

  parseXcmPalletExtrinsic,
  parseXTokensExtrinsic,
  decodeXcm,

  getParentChain,
};

async function fetchXcmConfig(): Promise<XcmConfig> {
  const response = await fetch(XCM_URL, { cache: 'default' });

  return response.json();
}

function getXcmConfig(): XcmConfig | null {
  return localStorageService.getFromStorage(XCM_KEY, null);
}

function saveXcmConfig(config: XcmConfig) {
  localStorage.setItem(XCM_KEY, JSON.stringify(config));
}

function getAvailableTransfers(chains: ChainXCM[], assetId: number, chainId: ChainId): XcmTransfer[] {
  const chain = chains.find((c) => c.chainId === toLocalChainId(chainId));
  const asset = chain?.assets.find((a) => a.assetId === assetId);

  return asset?.xcmTransfers || [];
}

async function getEstimatedFee(
  api: ApiPromise,
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
  xcmAsset?: object,
  xcmDest?: object,
): Promise<BN> {
  if (xcmTransfer.destination.fee.mode.type === 'proportional') {
    return xcmUtils.getEstimatedFeeFromConfig(config, assetLocation, originChain, xcmTransfer);
  }

  if (xcmAsset && xcmDest) {
    const xcmAssetLocation = Object.values(xcmAsset)[0][0].id.Concrete;
    const xcmDestLocation = Object.values(xcmDest as object)[0];

    return xcmUtils.estimateFeeFromApi(
      api,
      config.instructions[xcmTransfer.destination.fee.instructions],
      xcmAssetLocation,
      xcmDestLocation,
    );
  }

  return new BN(0);
}

function getEstimatedRequiredDestWeight(
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
): BN {
  const weight = xcmUtils.getEstimatedWeight(
    config.instructions,
    xcmTransfer.destination.fee.instructions,
    new BN(config.networkBaseWeight[xcmTransfer.destination.chainId]),
  );

  if (!assetLocation?.reserveFee) return weight;

  const isReserveChain = [originChain, xcmTransfer.destination.chainId].includes(assetLocation.chainId);

  if (isReserveChain) return weight;

  const reserveWeight = xcmUtils.getEstimatedWeight(
    config.instructions,
    assetLocation.reserveFee.instructions,
    new BN(config.networkBaseWeight[assetLocation.chainId]),
  );

  return weight.gte(reserveWeight) ? weight : reserveWeight;
}

function getAssetLocation(
  api: ApiPromise,
  transferType: XcmTransferType,
  asset: AssetXCM,
  assets: Record<AssetName, AssetLocation>,
  amount: BN,
  isArray = true,
): NonNullable<unknown> | undefined {
  const PathMap: Record<PathType, () => NonNullable<unknown> | undefined> = {
    relative: () => xcmUtils.getRelativeAssetLocation(assets[asset.assetLocation].multiLocation),
    absolute: () => xcmUtils.getAbsoluteAssetLocation(assets[asset.assetLocation].multiLocation),
    concrete: () => xcmUtils.getConcreteAssetLocation(asset.assetLocationPath.path),
  };

  const location = PathMap[asset.assetLocationPath.type]();

  const type = getTypeName(api, transferType, isArray ? 'assets' : 'asset');
  const assetVersionType = getTypeVersion(api, type || '');
  const assetObject = {
    id: {
      Concrete: location,
    },
    fun: {
      Fungible: amount.toString(),
    },
  };

  return { [assetVersionType]: isArray ? [assetObject] : assetObject };
}

function getVersionedDestinationLocation(
  api: ApiPromise,
  transferType: XcmTransferType,
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
) {
  const type = getTypeName(api, transferType, 'dest');
  const version = getTypeVersion(api, type || '');
  const location = xcmUtils.getDestinationLocation(originChain, destinationParaId, accountId);

  if (!version) return location;

  return { [version]: location };
}

function getVersionedAccountLocation(api: ApiPromise, transferType: XcmTransferType, accountId?: AccountId) {
  const location = xcmUtils.getAccountLocation(accountId);
  const type = getTypeName(api, transferType, 'dest');
  const version = getTypeVersion(api, type || '');

  if (!version) return location;

  return {
    [version]: location,
  };
}

type ParsedPayload = {
  isRelayToken: boolean;
  amount: string;
  destParachain: number;
  destAccountId: string;
  toRelayChain: boolean;
};

type XcmPalletPayload = ParsedPayload & {
  assetGeneralIndex: string;
  assetParachain?: number;
  type: 'xcmPallet';
};

type XTokensPayload = ParsedPayload & {
  assetGeneralKey: string;
  assetParachain: number;
  type: 'xTokens';
};

function parseXcmPalletExtrinsic(args: Omit<XcmPalletTransferArgs, 'feeAssetItem' | 'weightLimit'>): XcmPalletPayload {
  const xcmVersion = Object.keys(args.dest as NonNullable<unknown>)[0];

  const assetInterior = get(args.assets, `${xcmVersion}[0].id.Concrete.interior`) as unknown as NonNullable<unknown>;
  const destInterior = get(args.dest, `${xcmVersion}.interior`) as unknown as NonNullable<unknown>;
  const beneficiaryInterior = get(args.beneficiary, `${xcmVersion}.interior`) as unknown as NonNullable<unknown>;

  const parsedPayload = {
    isRelayToken: assetInterior === 'Here',
    amount: xcmUtils.toRawString(get(args.assets, `${xcmVersion}[0].fun.Fungible`) as string),
    destParachain: 0,
    destAccountId: '',
    assetGeneralIndex: '',
    assetParachain: 0,
    toRelayChain: destInterior === 'Here',
    type: 'xcmPallet' as const,
  };

  const beneficiaryJunction = Object.keys(beneficiaryInterior)[0];
  const substrateAccountId = get(beneficiaryInterior, `${beneficiaryJunction}.AccountId32.id`) as unknown as string;
  const ethAccountId = get(beneficiaryInterior, `${beneficiaryJunction}.AccountKey20.key`) as unknown as string;
  parsedPayload.destAccountId = substrateAccountId || ethAccountId;

  const destJunction = Object.keys(destInterior)[0];
  parsedPayload.destParachain = Number(xcmUtils.toRawString(get(destInterior, `${destJunction}.Parachain`)));

  if (!parsedPayload.isRelayToken) {
    const assetJunction = Object.keys(assetInterior)[0];
    const cols = xcmUtils.getJunctionCols<{ GeneralIndex: string; Parachain: number }>(assetInterior, assetJunction);

    parsedPayload.assetGeneralIndex = xcmUtils.toRawString(cols?.GeneralIndex);
    parsedPayload.assetParachain = cols?.Parachain ? Number(xcmUtils.toRawString(cols.Parachain.toString())) : 0;
  }

  return parsedPayload;
}

function parseXTokensExtrinsic(args: Omit<XTokenPalletTransferArgs, 'destWeight' | 'destWeightLimit'>): XTokensPayload {
  const xcmVersion = Object.keys(args.dest as NonNullable<unknown>)[0];

  const assetInterior = get(args.asset, `${xcmVersion}.id.Concrete.interior`) as unknown as NonNullable<unknown>;
  const destInterior = get(args.dest, `${xcmVersion}.interior`) as unknown as NonNullable<unknown>;

  const parsedPayload = {
    isRelayToken: assetInterior === 'Here',
    amount: xcmUtils.toRawString(get(args.asset, `${xcmVersion}.fun.Fungible`) as string),
    destParachain: 0,
    destAccountId: '',
    assetParachain: 0,
    assetGeneralKey: '',
    toRelayChain: false,
    type: 'xTokens' as const,
  };

  if (!parsedPayload.isRelayToken) {
    const assetJunction = Object.keys(assetInterior)[0];
    const cols = xcmUtils.getJunctionCols<{ Parachain: number; GeneralKey: string }>(assetInterior, assetJunction);
    parsedPayload.assetParachain = Number(xcmUtils.toRawString(cols.Parachain.toString()));
    parsedPayload.assetGeneralKey = cols.GeneralKey;
  }

  const destJunction = Object.keys(destInterior)[0];
  parsedPayload.toRelayChain = destJunction === 'X1';

  if (parsedPayload.toRelayChain) {
    const substrateAccountId = get(destInterior, `X1.AccountId32.id`) as unknown as string;
    const ethAccountId = get(destInterior, `X1.AccountKey20.key`) as unknown as string;

    parsedPayload.destAccountId = substrateAccountId || ethAccountId;
  } else {
    const cols = xcmUtils.getJunctionCols<{ Parachain?: number }>(destInterior, destJunction);
    if (cols.Parachain) {
      parsedPayload.destParachain = Number(xcmUtils.toRawString(cols.Parachain.toString()));
      parsedPayload.toRelayChain = false;
    }
    parsedPayload.destAccountId = (get(cols, 'AccountId32.id') || get(cols, 'AccountKey20.key')) as unknown as string;
  }

  return parsedPayload;
}

type DecodedPayload = {
  assetId?: number | string;
  destinationChain?: HexString;
  value: string;
  dest: string;
};

function decodeXcm(chainId: ChainId, data: XcmPalletPayload | XTokensPayload): DecodedPayload {
  const config = getXcmConfig();
  if (!config) return {} as DecodedPayload;

  let destinationChain: HexString | undefined;
  if (data.toRelayChain) {
    destinationChain = chainsService.getChainById(chainId)?.parentId;
  } else {
    const destination = Object.values(config.assetsLocation).find(({ multiLocation }) => {
      return multiLocation.parachainId === data.destParachain;
    });

    destinationChain = destination ? `0x${destination.chainId}` : undefined;
  }

  const configOriginChain = config.chains.find((c) => `0x${c.chainId}` === chainId);

  let assetId: number | string | undefined;
  if (!data.isRelayToken && configOriginChain) {
    const filteredAssetLocations = configOriginChain.assets.reduce<[number, AssetLocation][]>((acc, asset) => {
      acc.push([asset.assetId, config.assetsLocation[asset.assetLocation]]);

      return acc;
    }, []);

    const assetKeyVal = filteredAssetLocations.find(([_, { multiLocation }]) => {
      const xcmPalletMatch =
        data.type === 'xcmPallet' &&
        (!data.assetParachain || multiLocation.parachainId === data.assetParachain) &&
        (multiLocation.generalIndex === data.assetGeneralIndex || data.assetGeneralIndex.length === 0);

      const xTokensMatch =
        data.type === 'xTokens' &&
        multiLocation.parachainId === data.assetParachain &&
        multiLocation.generalKey === data.assetGeneralKey;

      return xcmPalletMatch || xTokensMatch;
    });

    if (assetKeyVal) {
      const assetFromChain = chainsService
        .getChainById(chainId)
        ?.assets.find((asset) => asset.assetId === assetKeyVal[0]);
      if (assetFromChain) {
        assetId = getAssetId(assetFromChain);
      }
    } else {
      console.log(`XCM config cannot handle - ${data}`);
    }
  }

  return {
    assetId,
    destinationChain,
    value: data.amount,
    dest: data.destAccountId,
  };
}

function getParentChain(chain: Chain, chains: Record<ChainId, Chain>) {
  if (!chain.parentId) return chain;

  return chains[chain.parentId];
}

async function getDeliveryFeeFromConfig({
  config,
  originChain,
  destinationChain,
  originApi,
  destinationChainId,
  extrinsic,
}: {
  config: XcmConfig;
  originChain: string;
  destinationChain: Chain;
  originApi: ApiPromise;
  destinationChainId: number;
  extrinsic: SubmittableExtrinsic<'promise'>;
}): Promise<BN> {
  const direction = destinationChain.parentId ? 'toParachain' : 'toParent';

  const deliveryFeeConfig = config.networkDeliveryFee[originChain]?.[direction];

  if (!deliveryFeeConfig) return new BN(0);

  let deliveryFactor: string;

  if (direction === 'toParent') {
    deliveryFactor = (
      await originApi.query[camelCase(deliveryFeeConfig.factorPallet)].upwardDeliveryFeeFactor()
    ).toString();
  } else {
    deliveryFactor = (
      await originApi.query[camelCase(deliveryFeeConfig.factorPallet)].deliveryFeeFactor(destinationChainId)
    ).toString();
  }

  const weight = new BN(extrinsic.length).add(SET_TOPIC_SIZE);
  const feeSize = new BN(deliveryFeeConfig.sizeBase).add(weight.mul(new BN(deliveryFeeConfig.sizeFactor)));
  const deliveryFee = feeSize.mul(new BN(deliveryFactor)).div(BN_TEN.pow(FACTOR_MULTIPLIER));

  return deliveryFee;
}
