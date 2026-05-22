import { isHex } from '@polkadot/util';
import { useMemo } from 'react';

import { type CallData, type DecodedTransaction } from '@/shared/core';
import { getNativeAssetId } from '@/shared/lib/utils';
import { type Draft } from '@/domains/backend';
import { useApi, useChain } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';

export const useDecodedDraftTransaction = (draft: Draft): DecodedTransaction | null => {
  const chain = useChain(draft.chainId);
  const api = useApi(draft.chainId);

  return useMemo(() => {
    if (!draft.callData || !isHex(draft.callData) || !api || !chain || !draft.multisigAccountId) return null;

    try {
      return decodeCallData(api, draft.multisigAccountId, draft.callData as CallData, getNativeAssetId(chain.assets));
    } catch {
      return null;
    }
  }, [draft.callData, draft.multisigAccountId, api, chain]);
};
