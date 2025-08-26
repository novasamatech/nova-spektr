import { z } from 'zod';

import { type ChainId, type HexString } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';
import { getChainRegistry } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { evidenceService } from './service';
import { type Evidence, type EvidenceContent, type EvidencePeriods, type EvidenceSummary } from './types';

type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accounts: AccountId[];
};

export const evidenceResource = createRemoteResource<EvidenceRequestParams, Evidence[]>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  cache: {
    key: ({ palletType, chainId, accounts }) => `${palletType}:${chainId}:${accounts.join(',')}`,
    ttl: 30 * 1000,
  },
  async fn({ palletType, chainId, accounts }) {
    const papi = getChainRegistry().getApi(chainId);
    const evidences = await collectiveCorePallet.storage.memberEvidence(palletType, papi, accounts);

    return evidences
      .map(({ account, evidence }) => {
        if (nullable(evidence)) return null;

        return {
          chainId,
          pallet: palletType,
          wish: evidence.wish,
          accountId: account,
          hash: evidence.value,
        };
      })
      .filter(nonNullable);
  },
});

type EvidenceContentRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accountId: AccountId;
  blockHash?: string;
};

export const evidenceContentResource = createRemoteResource<EvidenceContentRequestParams, EvidenceContent | null>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  cache: {
    key: ({ palletType, chainId, accountId }) => `${palletType}:${chainId}:${accountId}`,
    ttl: 30 * 1000,
  },
  async fn({ palletType, chainId, accountId }) {
    const papi = getChainRegistry().getApi(chainId);
    const evidences = await collectiveCorePallet.storage.memberEvidence(palletType, papi, [accountId]);
    const evidence = evidences.at(0);

    if (evidence?.evidence) {
      const response = await fetch(evidenceService.getEvidenceIpfsUrl(evidence.evidence.value));

      if (response.status < 200 || response.status >= 300) {
        return null;
      }
      const content = await response.text();

      return {
        pallet: palletType,
        chainId,
        wish: evidence.evidence.wish,
        accountId,
        cid: evidenceService.getCidByEvidence(evidence.evidence.value),
        hash: evidence.evidence.value,
        content,
      };
    }

    return null;
  },
});

type PeriodsRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const evidencePeriodResource = createRemoteResource<PeriodsRequestParams, EvidencePeriods>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  cache: {
    key: ({ palletType, chainId }) => `${palletType}:${chainId}`,
    ttl: 60 * 1000,
  },
  async fn({ palletType, chainId }) {
    const papi = getChainRegistry().getApi(chainId);
    const params = await collectiveCorePallet.storage.params(palletType, papi);

    return {
      chainId,
      pallet: palletType,
      minPromotionPeriod: params.min_promotion_period,
      demotionPeriod: params.demotion_period,
      offboardTimeout: params.offboard_timeout,
    };
  },
});

const summaryResponseSchema = z.object({
  summary: z.string(),
  numberOfPullRequests: z.number().nullable(),
  numberOfMergedPullRequests: z.number().nullable(),
});

type EvidenceSummaryRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  evidence: HexString;
  accountId: AccountId;
  /**
   * User GitHub name
   */
  githubHandle?: string;
  /**
   * Date string YYYY-MM-DD
   */
  evidencePeriodStart?: string | null;
};

export const evidenceSummaryResource = createRemoteResource<EvidenceSummaryRequestParams, EvidenceSummary>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  cache: { ttl: 60 * 1000 },
  async fn({ palletType, accountId, evidence, chainId, githubHandle, evidencePeriodStart }) {
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
        languageIsoCode: 'en',
        githubHandle,
        evidencePeriodStart,
      }),
    });

    const evidenceSummary = await request.then(r => r.json()).then(summaryResponseSchema.parse);

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
