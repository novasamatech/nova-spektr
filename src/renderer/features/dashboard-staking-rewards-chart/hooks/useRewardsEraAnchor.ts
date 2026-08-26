import { type Chain, type ChainId } from '@/shared/core';
import { type ActiveEraAnchor, useEraAnchor } from '@/domains/staking';
import { useApi } from '@/entities/network';

/** Placeholder key for "no chain selected" — resolves to no api, hence no era. */
const NO_CHAIN: ChainId = '0x00';

/**
 * The chain's era anchor, or `null` while it cannot be established. Everything
 * the hover card says about eras is derived from it — when it is `null` the
 * title simply carries no era rather than an estimate.
 */
export const useRewardsEraAnchor = (chain: Chain | null): ActiveEraAnchor | null => {
  const chainId = chain?.chainId ?? NO_CHAIN;
  const api = useApi(chainId);
  // Asset Hub carries neither `session` nor `babe`, so era timing is read off
  // the relay chain — the same pairing the staking positions aggregate uses.
  const relayApi = useApi(chain?.parentId ?? chainId);

  return useEraAnchor({ chainId, api, timelineApi: relayApi ?? api, chain });
};
