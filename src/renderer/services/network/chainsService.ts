import { Chain, IChainService } from './types';
import chains from './chains.json';

export function useChains(): IChainService {
  return {
    getChainsData: () => Promise.resolve(chains as unknown as Chain[]),
  };
}
