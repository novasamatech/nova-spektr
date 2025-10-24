import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { Compact } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType, type HexString } from '@/shared/core';
import { createPagesHandler } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import {
  type FrameSupportPreimagesBounded,
  type ReferendaDecidingStatus,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendumId,
  referendaPallet,
} from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createRemoteResource, createSubscriptionResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

import { type Proposal, type Referendum, type ReferendumWithEvidence } from './types';

async function parseProposal(proposal: FrameSupportPreimagesBounded, api: ApiPromise): Promise<Proposal | null> {
  let proposalHex: HexString | null = null;

  if (proposal.type === 'Inline') {
    proposalHex = proposal.data;
  }

  if (proposal.type === 'Lookup') {
    const preimage = await api.query.preimage.preimageFor([proposal.data.hash_, proposal.data.len]);
    if (preimage.isSome) {
      proposalHex = u8aToHex(preimage.value);
    }
  }

  if (nullable(proposalHex)) return null;

  try {
    const struct = api.registry.createType('Proposal', proposalHex);

    // parsing "who" argument for promote/retain
    if (struct.method === 'promote' || struct.method === 'promoteFast' || struct.method === 'approve') {
      const parsed = pjsSchema.accountId.safeParse(struct.args.at(0));

      if (parsed.success) {
        return {
          type: 'Evidence',
          accountId: parsed.data,
        };
      }
    }

    if (struct.section === 'polkadotXcm' && struct.method === 'send') {
      //todo learn how to read arguments (multilocation chainId and call)

      return {
        type: 'Whitelist',
      };
    }

    if (struct.method === 'spendLocal') {
      const amountCodec = struct.args.at(0);
      const amountU128 = amountCodec instanceof Compact ? amountCodec.unwrap() : amountCodec;
      const amountBN = pjsSchema.u128.safeParse(amountU128);

      if (!amountBN.success) {
        throw new Error('spendLocal', amountBN.error);
      }

      return {
        type: 'Spend',
        amount: amountBN.data,
      };
    }

    //todo learn how to read multilocation for asset and destination
    if (struct.method === 'spend') {
      const amountCodec = struct.args.at(1);
      const amountU128 = amountCodec instanceof Compact ? amountCodec.unwrap() : amountCodec;
      const amountBN = pjsSchema.u128.safeParse(amountU128);

      if (!amountBN.success) {
        throw new Error('spend', amountBN.error);
      }

      return {
        type: 'Spend',
        amount: amountBN.data,
      };
    }

    // system.remark('RFC_APPROVE({GITHUB_PR},{DOCUMENT_HASH})') is used for rfc voting.
    if (struct.method === 'remark' || struct.method === 'remarkWithEvent') {
      const parsed = pjsSchema.uint8String.safeParse(struct.args.at(0));
      if (parsed.success) {
        const regexp = /RFC_APPROVE\(0*?([1-9]+),(.+)\)/;
        const match = regexp.exec(parsed.data);
        if (match) {
          const pullRequest = match[1];
          const documentHash = match[2];

          if (pullRequest && documentHash) {
            return {
              type: 'Rfc',
              pullRequest,
              documentHash,
            };
          }
        } else {
          return {
            type: 'Unknown',
            description: parsed.data,
          };
        }
      }
    }

    return {
      type: 'Unknown',
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

function getEndBlock(
  deciding: ReferendaDecidingStatus | null,
  submitted: BlockHeight,
  decisionPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
) {
  if (deciding?.confirming) return deciding.confirming;
  if (deciding) return pjsSchema.helpers.toBlockHeight(deciding.since + decisionPeriod);

  return pjsSchema.helpers.toBlockHeight(submitted + undecidingTimeout);
}

async function mapReferendum({
  id,
  info,
  chainId,
  pallet,
  tracks,
  undecidingTimeout,
  api,
}: {
  id: ReferendumId;
  info: ReferendaReferendumInfoConvictionVotingTally;
  undecidingTimeout: BlockHeight;
  tracks: ReturnType<typeof referendaPallet.consts.tracks>;
  api: ApiPromise;
  chainId: ChainId;
  pallet: CollectivePalletsType;
}): Promise<Referendum> {
  switch (info.type) {
    case 'Ongoing': {
      if (!('bareAyes' in info.data.tally)) {
        throw new Error(`Collective tally is incorrect, got\n${JSON.stringify(info.data.tally, null, 2)}`);
      }

      const track = tracks.find(({ id }) => id === info.data.track);
      if (!track) {
        throw new Error(`Track ${info.data.track} not found in referenda pallet`);
      }

      const proposal = await parseProposal(info.data.proposal, api);
      const ends = getEndBlock(info.data.deciding, info.data.submitted, track.info.decisionPeriod, undecidingTimeout);

      return {
        id,
        type: info.type,
        chainId,
        pallet,
        track: info.data.track,
        submitted: info.data.submitted,
        origin: info.data.origin.type,
        enactment: {
          value: info.data.enactment.data,
          type: info.data.enactment.type,
        },
        inQueue: info.data.inQueue,
        deciding: info.data.deciding,
        tally: info.data.tally,
        decisionDeposit: info.data.decisionDeposit,
        submissionDeposit: info.data.submissionDeposit,
        proposal,
        ends,
      };
    }
    case 'Approved':
    case 'Rejected':
    case 'Cancelled':
    case 'TimedOut': {
      return {
        id,
        type: info.type,
        chainId,
        pallet,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    }
    case 'Killed': {
      return {
        id,
        type: info.type,
        chainId,
        pallet,
        since: info.data,
      };
    }
  }
}

async function mapReferendums(
  list: { id: ReferendumId; info: ReferendaReferendumInfoConvictionVotingTally | null }[],
  api: ApiPromise,
  pallet: CollectivePalletsType,
  chainId: ChainId,
) {
  const undecidingTimeout = referendaPallet.consts.undecidingTimeout(pallet, api);
  const tracks = referendaPallet.consts.tracks(pallet, api);
  const referendums: Referendum[] = [];
  for (const { id, info } of list) {
    if (!info) continue;
    const referendum = await mapReferendum({ id, info, tracks, undecidingTimeout, api, pallet, chainId });
    referendums.push(referendum);
  }

  return referendums;
}

type ReferendumSubscriptionParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const subscriptionResource = createSubscriptionResource<ReferendumSubscriptionParams, Referendum[]>({
  pool: ({ palletType, chainId }) => `${palletType}:${chainId}`,
  async fn({ api, chainId, palletType }, callback) {
    let abortController = new AbortController();

    await api.isReady;

    const fetchPages = createPagesHandler({
      fn: () => referendaPallet.storage.referendumInfoForPaged(palletType, api, 400),
      map: record => mapReferendums(record, api, palletType, chainId),
    });

    fetchPages(abortController, callback);

    const fn = () => {
      abortController.abort();
      abortController = new AbortController();
      fetchPages(abortController, callback);
    };

    /**
     * All events related to referendums / voting are collected here
     *
     * @see https://github.com/paritytech/polkadot-sdk/blob/43cd6fd4370d3043272f64a79aeb9e6dc0edd13f/substrate/frame/collective/src/lib.rs#L459
     */
    return polkadotjsHelpers.subscribeSystemEvents({ api, section: `${palletType}Referenda` }, fn).then(fn => () => {
      abortController.abort();
      fn();
    });
  },
});

type ReferendumRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
  referendums: ReferendumId[];
};

export const fetchResource = createRemoteResource<ReferendumRequestParams, Referendum[]>({
  async fn({ api, chainId, palletType, referendums }) {
    const response = await referendaPallet.storage.referendumInfoFor(palletType, api, referendums);
    return mapReferendums(response, api, palletType, chainId);
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
        completed
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
        completed: z.boolean(),
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

type RequestRefendumsParams = {
  chain: Chain;
  palletType: CollectivePalletsType;
};

export const referendumsWithEvidenceResource = createRemoteResource<RequestRefendumsParams, ReferendumWithEvidence[]>({
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
      completed: item.completed,
      evidence: item.evidence.nodes.map(e => ({ hash: e.hash })),
    }));
  },
});
