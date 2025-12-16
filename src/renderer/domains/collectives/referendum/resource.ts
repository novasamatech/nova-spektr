import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { Compact } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import {
  type Chain,
  type ChainId,
  ExternalType,
  type ReferendumId as GovernanceReferendumId,
  type HexString,
} from '@/shared/core';
import { createPagesHandler } from '@/shared/effector';
import { dictionary, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import {
  type FrameSupportPreimagesBounded,
  type ReferendaDecidingStatus,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendumId,
  referendaPallet,
} from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';
import { mergeNested } from '../_lib/helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type Proposal, type Referendum } from './types';

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
        proposalHex,
        proposalHash: blake2AsHex(proposalHex),
        proposalJSON: struct.toJSON(),
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

const $sharedReferendumsCache = createStore<CollectivesStruct<Referendum[]>>({});

export type ReferendumSubscriptionParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
};

export const subscriptionResource = createSubscriptionResource<ReferendumSubscriptionParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .subscribe<Referendum[]>(async ({ api, palletType }, callback) => {
    const chainId = api.genesisHash.toHex();

    let abortController = new AbortController();

    const fetchPages = createPagesHandler({
      fn: () => referendaPallet.storage.referendumInfoForPaged(palletType, api, 400),
      map: record => mapReferendums(record, api, palletType, chainId),
    });

    fetchPages(abortController, ({ value }) => {
      if (value) {
        callback(value);
      }
    });

    const fn = () => {
      abortController.abort();
      abortController = new AbortController();
      fetchPages(abortController, ({ value }) => {
        if (value) {
          callback(value);
        }
      });
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
  })
  .cache({
    store: $sharedReferendumsCache,
    map: (state, referendums) => mergeNested(state, referendums, r => r.id),
  })
  .build();

export type ReferendumRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  referendums: ReferendumId[];
};

export const fetchResource = createQueryResource<ReferendumRequestParams>({
  key: ({ palletType, api, referendums }) => [palletType, api.genesisHash.toHex(), referendums],
})
  .request<Referendum[]>(async ({ api, palletType, referendums }) => {
    const chainId = api.genesisHash.toHex();
    const response = await referendaPallet.storage.referendumInfoFor(palletType, api, referendums);
    return mapReferendums(response, api, palletType, chainId);
  })
  .cache({
    store: $sharedReferendumsCache,
    map: (state, referendums) => mergeNested(state, referendums, r => r.id),
  })
  .build();

const GET_REFERENDUMS_QUERY = gql`
  query GetReferendums($pallet: Pallet, $chainId: String!) {
    referendums(filter: { pallet: { equalTo: $pallet }, chainId: { equalTo: $chainId } }) {
      nodes {
        index
        relatedReferendum {
          chainId
          index
          id
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
        relatedReferendum: z.nullable(
          z.object({
            chainId: z.custom<ChainId>(),
            index: z.custom<ReferendumId>(),
          }),
        ),
      }),
    ),
  }),
});

const requestCollectivesReferendumsMapToGovernance = async (url: string, chainId: ChainId) => {
  const client = new GraphQLClient(url);
  console.log('requestCollectivesReferendumsMapToGovernance', url, chainId);
  const result = await client.request(GET_REFERENDUMS_QUERY, {
    pallet: 'fellowship',
    chainId,
  });
  try {
    const parsed = referendumsGqlSchema.parse(result);
    return parsed.referendums.nodes;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export type ReferendumsMapToGovernanceParams = {
  chain: Chain;
  palletType: CollectivePalletsType;
};

export const collectivesReferendumsMapToGovernanceResource = createQueryResource<ReferendumsMapToGovernanceParams>({
  key: ({ chain, palletType }) => [chain.chainId, palletType],
})
  .request(async ({ chain }) => {
    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;
    if (!sourceUrl) return {};

    const result = await requestCollectivesReferendumsMapToGovernance('http://localhost:3000', chain.chainId);

    return dictionary(result, 'index', item =>
      item.relatedReferendum
        ? {
            chainId: item.relatedReferendum.chainId,
            referendumId: String(item.relatedReferendum.index) satisfies GovernanceReferendumId,
          }
        : null,
    );
  })
  .retry({
    count: 3,
    delay: 5000,
  })
  .cache({
    store: createStore<
      CollectivesStruct<
        Record<
          ReferendumId,
          {
            chainId: ChainId;
            referendumId: GovernanceReferendumId;
          }
        >
      >
    >({}),
    staleAfter: 30 * 1000,
    map: (state, referendums, { chain, palletType }) => {
      const prev = pickNestedValue(state, palletType, chain.chainId) ?? {};
      return setNestedValue(state, palletType, chain.chainId, { ...prev, ...referendums });
    },
  })
  .build();
