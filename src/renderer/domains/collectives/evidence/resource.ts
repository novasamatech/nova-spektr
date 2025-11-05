import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType, type HexString } from '@/shared/core';
import { merge, nonNullable, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';
import { mergeNested } from '../_lib/helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { evidenceService } from './service';
import {
  type Evidence,
  type EvidenceContent,
  type EvidencePeriods,
  type EvidenceSummary,
  type ReferendumWithEvidence,
} from './types';

export type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  accounts: AccountId[];
};

export const evidenceResource = createSubscriptionResource<EvidenceRequestParams>({
  key: ({ palletType, api, accounts }) => [palletType, api.genesisHash.toHex(), accounts],
})
  .subscribe<Evidence[]>(({ palletType, api, accounts }, callback) => {
    const chainId = api.genesisHash.toHex();
    return collectiveCorePallet.storage.memberEvidenceWatch(palletType, api, accounts, evidences => {
      const mapped = evidences
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

      callback(mapped);
    });
  })
  .cache<CollectivesStruct<Evidence[]>>({
    store: createStore({}),
    map(state, evidences) {
      return mergeNested(state, evidences, e => e.accountId);
    },
  })
  .build();

export type EvidenceContentRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  accountId: AccountId;
  blockHash?: string;
};

export const evidenceContentResource = createQueryResource<EvidenceContentRequestParams>({
  key: ({ palletType, api, accountId, blockHash }) => [palletType, api.genesisHash.toHex(), accountId, blockHash],
})
  .request<EvidenceContent | null>(async ({ palletType, api, accountId, blockHash }) => {
    const chainId = api.genesisHash.toHex();
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
  })
  .retry({
    count: 3,
    delay: 1000,
  })
  .cache<CollectivesStruct<EvidenceContent[]>>({
    store: createStore({}),
    staleAfter: 60_000,
    map(state, evidence) {
      if (evidence === null) return state;
      const prev = pickNestedValue(state, evidence.pallet, evidence.chainId) ?? [];
      const merged = merge({
        a: prev,
        b: [evidence],
        mergeBy: e => [e.pallet, e.chainId, e.accountId],
      });
      return setNestedValue(state, evidence.pallet, evidence.chainId, merged);
    },
  })
  .build();

export type PeriodsRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
};

export const evidencePeriodResource = createQueryResource<PeriodsRequestParams>({
  key: ({ palletType, chain }) => [palletType, chain.chainId],
})
  .request<EvidencePeriods>(async ({ palletType, api, chain }) => {
    const params = await collectiveCorePallet.storage.params(palletType, api);

    return {
      pallet: palletType,
      chainId: chain.chainId,
      minPromotionPeriod: params.minPromotionPeriod,
      demotionPeriod: params.demotionPeriod,
      offboardTimeout: params.offboardTimeout,
    };
  })
  .cache<CollectivesStruct<EvidencePeriods>>({
    store: createStore({}),
    staleAfter: 60 * 1000,
    map(state, period) {
      return setNestedValue(state, period.pallet, period.chainId, period);
    },
  })
  .build();

const summaryResponseSchema = z.object({
  summary: z.string(),
  numberOfPullRequests: z.number().nullable(),
  numberOfMergedPullRequests: z.number().nullable(),
});

export type EvidenceSummaryRequestParams = {
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

export const evidenceSummaryResource = createQueryResource<EvidenceSummaryRequestParams>({
  key: ({ palletType, evidence, chainId, accountId }) => [palletType, evidence, chainId, accountId],
})
  .request<EvidenceSummary>(async ({ palletType, accountId, evidence, chainId, githubHandle, evidencePeriodStart }) => {
    const evidenceId = evidenceService.getCidByEvidence(evidence);
    const url = new URL('/api/v1/evidence-summaries/single', 'https://opengov-backend-dev.novasama-tech.org');

    const request = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  })
  .cache<CollectivesStruct<EvidenceSummary[]>>({
    store: createStore({}),
    staleAfter: 60 * 1000,
    map(state, summary) {
      const prev = pickNestedValue(state, summary.pallet, summary.chainId) ?? [];
      const merged = merge({
        a: prev,
        b: [summary],
        mergeBy: e => e.accountId,
      });

      return setNestedValue(state, summary.pallet, summary.chainId, merged);
    },
  })
  .build();

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

export type ReferendumsWithEvidence = z.infer<typeof referendumsGqlSchema>['referendums'];

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

export type RequestRefendumsParams = {
  chain: Chain;
  palletType: CollectivePalletsType;
};

export const evidenceToReferendumRelationsResource = createQueryResource<RequestRefendumsParams>({
  key: ({ palletType, chain }) => [palletType, chain.chainId],
})
  .request<ReferendumWithEvidence[]>(async ({ chain, palletType }) => {
    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;
    if (!sourceUrl) return [];
    const result = await requestReferendumsFromSubQuery(sourceUrl);

    return result.map(item => ({
      pallet: palletType,
      chainId: chain.chainId,
      referendumId: item.index,
      evidence: item.evidence.nodes.map(e => ({ hash: e.hash })),
    }));
  })
  .cache<CollectivesStruct<ReferendumWithEvidence[]>>({
    store: createStore({}),
    map: (state, data) => mergeNested(state, data, r => r.referendumId),
  })
  .build();
