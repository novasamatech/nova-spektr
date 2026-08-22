import { useMemo } from 'react';

import { type DecodedTransaction } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import { useApi, useChain } from '@/entities/network';

import { decodeDraftTransaction, getDraftOriginAccountId } from './decode-draft-transaction';

export const useDecodedDraftTransaction = (draft: Draft): DecodedTransaction | null => {
  const chain = useChain(draft.chainId);
  const api = useApi(draft.chainId);

  return useMemo(
    () =>
      decodeDraftTransaction({ callData: draft.callData, originAccountId: getDraftOriginAccountId(draft), api, chain }),
    [draft, api, chain],
  );
};
