import { type TFunction } from 'i18next';

import { type Chain } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { referendumService, trackService } from '@/domains/collectives';
import { type FeedRecord, type Referendum, type Track } from '@/domains/collectives';
import { type AccountIdentity, identityService } from '@/domains/network';
import { type ReferendumDetails } from '../types';

export const getDescription = (record: FeedRecord, t: TFunction) => {
  switch (record.type) {
    case 'promoted':
      return t('fellowship.activityFeed.record.promoted', { rank: record.rank });
    case 'demoted':
      return t('fellowship.activityFeed.record.demoted', { rank: record.rank });
    case 'proven':
      return t('fellowship.activityFeed.record.proven', { rank: record.rank });
    case 'requested': {
      const requestedRecord = record as Extract<FeedRecord, { type: 'requested' }>;
      return requestedRecord.wish === 'Promotion'
        ? t('fellowship.activityFeed.record.submittedPromotion')
        : t('fellowship.activityFeed.record.submittedRetention');
    }
    case 'activeChanged':
      return t('fellowship.activityFeed.record.activeChanged', { status: record.isActive ? 'active' : 'inactive' });
    case 'imported':
      return t('fellowship.activityFeed.record.imported', { rank: record.rank });
    default:
      return undefined;
  }
};

type IdentityMap = Record<AccountId, AccountIdentity | undefined>;

export type ActivityFeedItem = FeedRecord & {
  description?: string;
  name?: string;
  actorAccountId?: string;
  actorName?: string;
  referendumDetails?: ReferendumDetails;
};

export function collectActivityAccountIds(
  feed: FeedRecord[],
  referendumsById?: Map<number, Referendum>,
  baseAccountIds: AccountId[] = [],
) {
  const ids = new Set<AccountId>(baseAccountIds);

  for (const record of feed) {
    ids.add(record.accountId);

    if (!referendumsById || record.type !== 'referendum') continue;

    const referendum = referendumsById.get(referendaPallet.helpers.toReferendumId(record.referendumId));
    if (!referendum) continue;

    const proposer = referendumService.getProposer(referendum);
    if (proposer) {
      ids.add(proposer);
    }
  }

  return Array.from(ids);
}

export function buildActivityRecords({
  feed,
  referendums,
  tracks,
  identities,
  chain,
  t,
}: {
  feed: FeedRecord[];
  referendums: Referendum[] | null;
  tracks: Track[] | null;
  identities: IdentityMap;
  chain: Chain | null;
  t: TFunction;
}): ActivityFeedItem[] {
  const filteredFeed = feed.filter(record => {
    if (record.type === 'paid') return false;
    if (record.type === 'referendum' && record.referendumStatus !== 'created') return false;
    return true;
  });

  if (!referendums || !tracks) {
    return filteredFeed.map(record => {
      const identity = identities[record.accountId];
      return {
        ...record,
        name: identity ? identityService.getFullName(identity) : undefined,
        description: getDescription(record, t),
      };
    });
  }

  const referendumsById = new Map(referendums.map(r => [r.id, r]));
  const tracksById = new Map(tracks.map(track => [track.id, track]));

  return filteredFeed.map(record => {
    const identity = identities[record.accountId];
    const baseRecord: ActivityFeedItem = {
      ...record,
      name: identity ? identityService.getFullName(identity) : undefined,
      description: getDescription(record, t),
    };

    if (record.type !== 'referendum') {
      return baseRecord;
    }

    const referendum = referendumsById.get(referendaPallet.helpers.toReferendumId(record.referendumId));
    if (!referendum) {
      return baseRecord;
    }

    const proposerAccountId = referendumService.getProposer(referendum);
    const track = tracksById.get(record.referendumTrackId);
    const isRetention = trackService.isRetentionTrack(record.referendumTrackId);
    const isPromotion = trackService.isPromotionTrack(record.referendumTrackId);

    if (!proposerAccountId || !track || (!isRetention && !isPromotion)) {
      return baseRecord;
    }

    const targetRank = trackService.getRankFromTrack(track);
    const proposerIdentity = identities[proposerAccountId];
    const proposerName = proposerIdentity
      ? identityService.getFullName(proposerIdentity)
      : toShortAddress(toAddress(proposerAccountId, { prefix: chain?.addressPrefix }), 5);

    return {
      ...baseRecord,
      actorAccountId: proposerAccountId,
      actorName: proposerName,
      referendumDetails: {
        referendumId: referendaPallet.helpers.toReferendumId(record.referendumId),
        targetAccountId: record.accountId,
        targetName: baseRecord.name,
        targetRank,
        isPromotion,
        isRetention,
      },
    };
  });
}
