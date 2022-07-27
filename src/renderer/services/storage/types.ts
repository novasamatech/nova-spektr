import { HexString } from '@renderer/domain/types';
import { ConnectionType } from '@renderer/services/network/types';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  getTestById: (id: string) => Promise<Test | undefined>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================
interface WithID {
  id?: string;
}

export interface Test extends WithID {
  name: string;
}

export interface Connection extends WithID {
  chainId: HexString;
  type: ConnectionType;
}
