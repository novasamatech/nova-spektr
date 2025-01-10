import { type HexString } from '@/shared/core';

export type AssetName = string;

export type XcmConfig = {
  assetsLocation: AssetsLocation;
  instructions: Instructions;
  networkDeliveryFee: NetworkDeliveryFee;
  networkBaseWeight: NetworkBaseWeight;
  chains: ChainXCM[];
};

export type MultiLocation = {
  parents?: number;
  parachainId?: number;
  palletInstance?: number;
  generalKey?: HexString;
  generalIndex?: string;
};

export type Fee = {
  instructions: InstructionType;
  mode: FeeMode;
};

export type AssetLocation = {
  chainId: string;
  multiLocation: MultiLocation;
  reserveFee?: Fee;
};
export type AssetsLocation = Record<AssetName, AssetLocation>;

export type InstructionType = 'xtokensDest' | 'xtokensReserve' | 'xcmPalletDest' | 'xcmPalletTeleportDest';

export type Instructions = Record<InstructionType, Action[]>;

export type FeeModeType = 'proportional' | 'standard';
export type FeeMode = {
  type: FeeModeType;
  value: string;
};

export type NetworkBaseWeight = {
  [chainId: string]: string;
};

export type DeliveryFeeConfig = {
  type: 'exponential';
  factorPallet: 'ParachainSystem' | 'XcmpQueue' | 'Dmp';
  sizeBase: string;
  sizeFactor: string;
  alwaysHoldingPays: boolean;
};

export type NetworkDeliveryFee = {
  [chainId: string]: {
    toParent?: DeliveryFeeConfig;
    toParachain?: DeliveryFeeConfig;
  };
};

export type AssetXCM = {
  assetId: number;
  assetLocation: string;
  assetLocationPath: {
    type: PathType;
    path?: MultiLocation;
  };
  xcmTransfers: XcmTransfer[];
};

export type ChainXCM = {
  chainId: string;
  assets: AssetXCM[];
};

export type XcmTransfer = {
  type: XcmTransferType;
  destination: {
    chainId: string;
    assetId: number;
    fee: Fee;
  };
};

export const enum XcmTransferType {
  XTOKENS = 'xtokens',
  XCMPALLET = 'xcmpallet',
  XCMPALLET_TELEPORT = 'xcmpallet-teleport',
  XCMPALLET_TRANSFER_ASSETS = 'xcmpallet-transferAssets',
}
export type PathType = 'absolute' | 'relative' | 'concrete';

export const enum Action {
  RESERVE_ASSET_DEPOSITED = 'ReserveAssetDeposited',
  WITHDRAW_ASSET = 'WithdrawAsset',
  RECEIVE_TELEPORTED_ASSET = 'ReceiveTeleportedAsset',
  CLEAR_ORIGIN = 'ClearOrigin',
  BUY_EXECUTION = 'BuyExecution',
  DEPOSIT_RESERVE_ASSET = 'DepositReserveAsset',
  DEPOSIT_ASSET = 'DepositAsset',
}
