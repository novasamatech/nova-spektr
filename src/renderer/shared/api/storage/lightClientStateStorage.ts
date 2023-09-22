import { LightClientState } from '@renderer/domain/lightClientState';
import { ChainId } from '@renderer/domain/shared-kernel';
import { lightClientStateDS, ILightClientStateStorage, TLightClientState } from './common/types';

export const useLightClientStateStorage = (db: TLightClientState): ILightClientStateStorage => ({
  getLightClientState: (chainId: ChainId): Promise<lightClientStateDS | undefined> => {
    return db.get({chainId});
  },

  addLightClientState: async (lightClient: LightClientState): Promise<void> => {
    try {
      await db.add(lightClient);
    } catch (e) {
      console.warn(
        `Light client state exists for chain ${lightClient.chainId}`,
      );
      await db.update(lightClient, { ...lightClient });
    }
  },
});
