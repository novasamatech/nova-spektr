import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType, type HexString } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

import { evidenceService } from './service';
import {
  type Evidence,
  type EvidenceContent,
  type EvidencePeriods,
  type EvidenceSummary,
  type EvidenceToReferendumRelation,
} from './types';

type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  accounts: AccountId[];
};

export const evidenceResource = createRemoteResource<EvidenceRequestParams, Evidence[]>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  cache: {
    key: ({ palletType, chainId, accounts }) => `${palletType}:${chainId}:${accounts.join(',')}`,
    ttl: 30 * 1000,
  },
  async fn({ palletType, api, chainId, accounts }) {
    const evidences = await collectiveCorePallet.storage.memberEvidence(palletType, api, accounts);
    return evidences
      .map(({ account, evidence }) => {
        if (nullable(evidence)) return null;

        return {
          pallet: palletType,
          chainId,
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
  api: ApiPromise;
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
  async fn({ palletType, api, chainId, accountId, blockHash }) {
    const apiInstance = blockHash ? await api.at(blockHash) : api;
    const evidences = await collectiveCorePallet.storage.memberEvidence(palletType, apiInstance as ApiPromise, [
      accountId,
    ]);
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
  api: ApiPromise;
  chain: Chain;
};

export const evidencePeriodResource = createRemoteResource<PeriodsRequestParams, EvidencePeriods>({
  pool: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
  cache: {
    key: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
    ttl: 60 * 1000,
  },
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

/**
 * Use this query to map referendums with evidences. If possible use chain
 * state.
 */
const GET_REFERENDUMS_QUERY = gql`
  query Referendums {
    referendums {
      nodes {
        index
        evidence {
          nodes {
            hash
          }
        }
      }
    }
  }
`;

const referendumsGqlSchema = z.object({
  referendums: z.object({
    nodes: z.array(
      z.object({
        index: z.custom<ReferendumId>(),
        evidence: z.object({
          nodes: z.array(
            z.object({
              hash: z.custom<HexString>(),
            }),
          ),
        }),
      }),
    ),
  }),
});

export type EvidenceToReferendumRelations = z.infer<typeof referendumsGqlSchema>['referendums']['nodes'];

const requestReferendumsFromSubQuery = async (url: string) => {
  const client = new GraphQLClient(url);
  const result = await client.request(GET_REFERENDUMS_QUERY);

  try {
    const parsed = referendumsGqlSchema.parse(result);
    return parsed.referendums.nodes;
  } catch (error) {
    console.error(error);
    return [];
  }
};

type EvidenceToReferendumRelationsParams = {
  chain: Chain;
  palletType: CollectivePalletsType;
};

export const evidenceToReferendumRelationsResource = createRemoteResource<
  EvidenceToReferendumRelationsParams,
  EvidenceToReferendumRelation[]
>({
  pool: ({ chain, palletType }) => `${palletType}:${chain.chainId}`,
  cache: {
    key: ({ chain, palletType }) => `${palletType}:${chain.chainId}`,
    ttl: 60 * 1000,
  },
  async fn({ chain, palletType }) {
    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;
    if (!sourceUrl) return [];
    const result = await requestReferendumsFromSubQuery(sourceUrl);

    return result.map(item => ({
      pallet: palletType,
      chainId: chain.chainId,
      index: item.index,
      evidence: item.evidence.nodes.map(e => ({ hash: e.hash })),
    }));
  },
});
