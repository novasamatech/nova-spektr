import { Chain, IChainService } from './common/types';
import chains from './common/chains.json';

export function useChains(): IChainService {
  return {
    getChainsData: () => Promise.resolve(chains as unknown as Chain[]),
  };
}
