import { HexString } from '@renderer/domain/shared-kernel';

export type AssetName = string;

export type XcmConfig = {
  assetsLocation: AssetsLocation;
  instructions: Instructions;
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
  reserveFee: Fee;
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

export type XcmTransferType = 'xtokens' | 'xcmpallet';
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
