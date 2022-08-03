import { HexString } from '@renderer/domain/types';
import { ConnectionType } from '@renderer/services/network/common/types';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================
interface WithID {
  id?: string;
}

export interface Connection extends WithID {
  chainId: HexString;
  type: ConnectionType;
}

export interface Balance {
  chainId: HexString;
  publicKey: HexString;
  assetId: string;
  verified: boolean;
  free: string;
  reserved: string;
  frozen: string;
}
