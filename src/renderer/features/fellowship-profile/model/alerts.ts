import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nonNullable, nullable } from '@/shared/lib/utils';
import {
  type Evidence,
  type FeedRecord,
  type Member,
  type Referendum,
  referendumService,
  trackService,
} from '@/domains/collectives';

import { fellowship } from './fellowship';
import { profile } from './profile';

type BaseAlert = {
  id: string;
  seen: boolean;
};
type ProvenAlert = BaseAlert & {
  type: 'proven';
  rank: number;
  referendumId: number;
};
type PromotedAlert = BaseAlert & {
  type: 'promoted';
  rank: number;
  referendumId: number;
};
type RetentionFailedAlert = BaseAlert & {
  type: 'retentionFailed';
  rank: number;
  referendumId: number;
};
type PromotionFailedAlert = BaseAlert & {
  type: 'promotionFailed';
  rank: number;
  referendumId: number;
};
type BumpedAlert = BaseAlert & {
  type: 'bumped';
  rank: number;
};
type RetentionRequestWhenPromotionReferendumExistsAlert = BaseAlert & {
  type: 'retentionRequestWhenPromotionReferendumExists';
};
type PromotionRequestWhenRetentionReferendumExistsAlert = BaseAlert & {
  type: 'promotionRequestWhenRetentionReferendumExists';
};

type Alert =
  | ProvenAlert
  | PromotedAlert
  | RetentionFailedAlert
  | PromotionFailedAlert
  | RetentionRequestWhenPromotionReferendumExistsAlert
  | PromotionRequestWhenRetentionReferendumExistsAlert
  | BumpedAlert;

const $memberEvidence = evidenceInfo.$memberEvidence;
const $referendums = fellowship.$store.map(s => s?.referendums ?? null);
const $tracks = fellowship.$store.map(s => s?.tracks ?? null);

const $promotionReferendum = combine(
  { referendums: $referendums, member: profile.$member, memberEvidence: $memberEvidence },
  ({ referendums, member, memberEvidence }) => {
    if (nullable(referendums) || nullable(member) || nullable(memberEvidence) || memberEvidence.wish !== 'Promotion')
      return null;

    const referendum = referendums.filter(referendumService.isOngoing).find(r => {
      const proposer = referendumService.getProposer(r) || memberEvidence?.accountId;
      return trackService.isPromotionTrack(r.track) && proposer === member.accountId;
    });

    return referendum ?? null;
  },
);

const $retentionReferendum = combine(
  { referendums: $referendums, member: profile.$member, memberEvidence: $memberEvidence },
  ({ referendums, member, memberEvidence }) => {
    if (nullable(referendums) || nullable(member) || nullable(memberEvidence) || memberEvidence.wish !== 'Retention')
      return null;

    const referendum = referendums.filter(referendumService.isOngoing).find(r => {
      const proposer = referendumService.getProposer(r) || memberEvidence?.accountId;
      return trackService.isRetentionTrack(r.track) && proposer === member.accountId;
    });

    return referendum ?? null;
  },
);

const $alertsWereSeen = createStore<Record<string, boolean>>({});

persist({
  key: 'fellowship-profile-alertsWereSeen',
  store: $alertsWereSeen,
  sync: true,
});

const getEvidenceAlertId = (memberEvidence: Evidence, referendum: Referendum) => {
  return `${memberEvidence.hash}-${referendum.id}`;
};

const $evidenceAlerts = combine(
  {
    alertsWereSeen: $alertsWereSeen,
    promotionReferendum: $promotionReferendum,
    retentionReferendum: $retentionReferendum,
    memberEvidence: $memberEvidence,
  },
  ({ alertsWereSeen, promotionReferendum, retentionReferendum, memberEvidence }): Alert[] => {
    if (nonNullable(memberEvidence) && memberEvidence.wish === 'Promotion' && nonNullable(retentionReferendum)) {
      const id = getEvidenceAlertId(memberEvidence, retentionReferendum);
      if (!alertsWereSeen[id]) {
        return [
          {
            id,
            type: 'promotionRequestWhenRetentionReferendumExists',
            seen: false,
          },
        ];
      }
    }

    if (nonNullable(memberEvidence) && memberEvidence.wish === 'Retention' && nonNullable(promotionReferendum)) {
      const id = getEvidenceAlertId(memberEvidence, promotionReferendum);
      if (!alertsWereSeen[id]) {
        return [
          {
            id,
            type: 'retentionRequestWhenPromotionReferendumExists',
            seen: false,
          },
        ];
      }
    }

    return [];
  },
);

const getFeedAlertId = (record: FeedRecord, member: Member) => {
  return `${record.type}-${record.block}-${member.accountId}`;
};

const $feedAlerts = combine(
  {
    member: profile.$member,
    feedList: activity.$list,
    alertsWereSeen: $alertsWereSeen,
    tracks: $tracks,
  },
  ({ member, feedList, alertsWereSeen, tracks }): Alert[] => {
    if (nullable(member) || nullable(feedList) || nullable(tracks)) return [];

    const alerts: Alert[] = [];

    for (const record of feedList) {
      const id = getFeedAlertId(record, member);
      if (alertsWereSeen[id]) continue;

      if (record.type === 'demoted') {
        alerts.push({
          id,
          type: 'bumped',
          rank: record.rank,
          seen: false,
        });
      }

      if (record.type === 'referendum') {
        const track = tracks.find(t => t.id === record.referendumTrackId);
        if (nullable(track)) continue;

        const rank = trackService.getRankFromTrack(track);
        const isRetention = trackService.isRetentionTrack(record.referendumTrackId);
        const isPromotion = trackService.isPromotionTrack(record.referendumTrackId);

        if (isRetention && record.referendumStatus === 'success') {
          alerts.push({
            id,
            type: 'proven',
            rank,
            referendumId: record.referendumId,
            seen: false,
          });
        }

        if (isRetention && record.referendumStatus === 'failed') {
          alerts.push({
            id,
            type: 'retentionFailed',
            rank,
            referendumId: record.referendumId,
            seen: false,
          });
        }

        if (isPromotion && record.referendumStatus === 'success') {
          alerts.push({
            id,
            type: 'promoted',
            rank,
            referendumId: record.referendumId,
            seen: false,
          });
        }

        if (isPromotion && record.referendumStatus === 'failed') {
          alerts.push({
            id,
            type: 'promotionFailed',
            rank,
            referendumId: record.referendumId,
            seen: false,
          });
        }
      }
    }

    return alerts;
  },
);

const $alerts = combine(
  { evidenceAlerts: $evidenceAlerts, feedAlerts: $feedAlerts },
  ({ evidenceAlerts, feedAlerts }) => [...evidenceAlerts, ...feedAlerts],
);

const $alert = $alerts.map(alerts => alerts[0] ?? null);

const markAsSeen = createEvent<string>();
const markAllAsSeen = createEvent();

sample({
  clock: markAsSeen,
  source: $alertsWereSeen,
  fn: (seen, id) => ({ ...seen, [id]: true }),
  target: $alertsWereSeen,
});

sample({
  clock: markAllAsSeen,
  source: { alerts: $alerts, alertsWereSeen: $alertsWereSeen },
  fn: ({ alerts, alertsWereSeen }) => ({
    ...alertsWereSeen,
    ...Object.fromEntries(alerts.map(alert => [alert.id, true])),
  }),
  target: $alertsWereSeen,
});

/**
 * On first load, we should mark all alerts as seen because they are not new to
 * the user.
 *
 * TODO: change to true after testing
 */
const $shouldMarkAlertsAsSeen = createStore(false);

// persist({
//   key: 'fellowship-profile-firstTimeAlertsMarkedSeen',
//   store: $shouldMarkAlertsAsSeen,
//   sync: true,
// });

sample({
  clock: $alerts,
  source: $shouldMarkAlertsAsSeen,
  filter: (shouldMarkAlertsAsSeen, alerts) => shouldMarkAlertsAsSeen && alerts.length > 0,
  fn: () => false,
  target: [$shouldMarkAlertsAsSeen, markAllAsSeen],
});

export const alertsModel = {
  $alert,

  markAsSeen,
  markAllAsSeen,
};
