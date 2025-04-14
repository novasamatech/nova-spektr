import { type ApiPromise } from '@polkadot/api';
import { z } from 'zod';

import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

import { evidenceService } from './service';
import { type Evidence, type EvidencePeriods, type EvidenceSummary } from './types';

type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  accountId: AccountId;
};

export const evidenceResource = createRemoteResource<EvidenceRequestParams, Evidence | null>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  async fn({ palletType, api, chainId, accountId }) {
    const evidence = await collectiveCorePallet.storage.memberEvidence(palletType, api, accountId);

    if (evidence) {
      const content = await fetch(evidenceService.getEvidenceIpfsUrl(evidence.value)).then(r => r.text());

      return {
        pallet: palletType,
        chainId,
        wish: evidence.wish,
        accountId,
        cid: evidenceService.getCidByEvidence(evidence.value),
        hash: evidence.value,
        content,
      };
    }

    return null;
  },
});

type PeriodsRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
};

export const evidencePeriodResource = createRemoteResource<PeriodsRequestParams, EvidencePeriods>({
  pool: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
  async fn({ palletType, api, chain }) {
    const params = await collectiveCorePallet.storage.params(palletType, api);

    return {
      pallet: palletType,
      chainId: chain.chainId,
      minPromotionPeriod: params.minPromotionPeriod,
      demotionPeriod: params.demotionPeriod,
      offboardTimeout: params.offboardTimeout,
    };
  },
});

function fetchEvidenceSummary(
  evidence: HexString,
  chainId: ChainId,
  languageIsoCode: string,
  githubHandle?: string,
  evidencePeriodStart?: string | null,
) {
  const schema = z.object({
    summary: z.string(),
    numberOfPullRequests: z.number().nullable(),
    numberOfMergedPullRequests: z.number().nullable(),
  });

  const evidenceId = evidenceService.getCidByEvidence(evidence);
  const url = new URL('/api/v1/evidence-summaries/single', 'https://opengov-backend-dev.novasama-tech.org');

  const request = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    body: JSON.stringify({
      chainId: chainId.replace(/^0x/, 'x'),
      evidenceId,
      languageIsoCode,
      githubHandle,
      evidencePeriodStart,
    }),
  });

  return request.then(r => r.json()).then(schema.parse);
}

type EvidenceSummaryRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  evidence: HexString;
  accountId: AccountId;
  /**
   * User github name
   */
  githubHandle?: string;
  /**
   * Date string YYYY-MM-DD
   */
  evidencePeriodStart?: string | null;
};

export const evidenceSummaryResource = createRemoteResource<EvidenceSummaryRequestParams, EvidenceSummary>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  async fn({ palletType, accountId, evidence, chainId, githubHandle, evidencePeriodStart }) {
    const evidenceSummary = await fetchEvidenceSummary(evidence, chainId, 'en', githubHandle, evidencePeriodStart);

    return {
      pallet: palletType,
      chainId,
      accountId,
      hash: evidence,
      summary: evidenceSummary.summary ?? '',
      github: evidenceSummary
        ? {
            pullRequests: evidenceSummary.numberOfPullRequests ?? null,
            mergedPullRequests: evidenceSummary.numberOfMergedPullRequests ?? null,
          }
        : null,
    };
  },
});
