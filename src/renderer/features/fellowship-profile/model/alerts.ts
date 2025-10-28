import { combine, createEvent, createStore, sample } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import {
  type Evidence,
  type FeedRecord,
  type Member,
  type Referendum,
  referendumService,
  trackService,
} from '@/domains/collectives';

import { activity } from './activity';
import { evidenceInfo } from './evidence';
import { fellowship } from './fellowship';
import { profile } from './profile';

const _ALERT_TYPES = [
  'proven',
  'promoted',
  'retentionFailed',
  'promotionFailed',
  'retentionRequestWhenPromotionReferendumExists',
  'promotionRequestWhenRetentionReferendumExists',
  'bumped',
  'severalReferendums', // TODO this should not exist!
] as const;

type AlertType = (typeof _ALERT_TYPES)[number];

type Alert = {
  id: string;
  type: AlertType;
  record?: FeedRecord;
  seen: boolean;
};

const $member = profile.$member;
const $feedList = activity.$list;

const $memberEvidence = evidenceInfo.$memberEvidence;
const $referendums = fellowship.$store.map(s => s?.referendums ?? null);

const $promotionReferendum = combine(
  { referendums: $referendums, member: $member, memberEvidence: $memberEvidence },
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
  { referendums: $referendums, member: $member, memberEvidence: $memberEvidence },
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
    const alerts: Alert[] = [];

    if (nonNullable(memberEvidence) && memberEvidence.wish === 'Promotion' && nonNullable(retentionReferendum)) {
      const id = getEvidenceAlertId(memberEvidence, retentionReferendum);
      if (!alertsWereSeen[id]) {
        alerts.push({
          id,
          type: 'promotionRequestWhenRetentionReferendumExists',
          seen: false,
        });
      }
    }

    if (nonNullable(memberEvidence) && memberEvidence.wish === 'Retention' && nonNullable(promotionReferendum)) {
      const id = getEvidenceAlertId(memberEvidence, promotionReferendum);
      if (!alertsWereSeen[id]) {
        alerts.push({
          id,
          type: 'retentionRequestWhenPromotionReferendumExists',
          seen: false,
        });
      }
    }

    return alerts;
  },
);

const getFeedAlertId = (record: FeedRecord, member: Member) => {
  return `${record.type}-${record.block}-${member.accountId}`;
};

const $feedAlerts = combine(
  {
    member: $member,
    feedList: $feedList,
    alertsWereSeen: $alertsWereSeen,
  },
  ({ member, feedList, alertsWereSeen }): Alert[] => {
    if (nullable(member) || nullable(feedList)) return [];

    const alerts: Alert[] = [];

    for (const record of feedList) {
      const id = getFeedAlertId(record, member);
      const seen = alertsWereSeen[id];
      if (seen) continue;

      if (record.type === 'demoted') {
        alerts.push({
          id,
          type: 'bumped',
          record,
          seen: false,
        });
      }

      if (record.type === 'referendum') {
        const isRetention = trackService.isRetentionTrack(record.referendumTrackId);
        const isPromotion = trackService.isPromotionTrack(record.referendumTrackId);

        if (isRetention && record.referendumStatus === 'success') {
          alerts.push({
            id,
            type: 'proven',
            record,
            seen: false,
          });
        }

        if (isRetention && record.referendumStatus === 'failed') {
          alerts.push({
            id,
            type: 'retentionFailed',
            record,
            seen: false,
          });
        }

        if (isPromotion && record.referendumStatus === 'success') {
          alerts.push({
            id,
            type: 'promoted',
            record,
            seen: false,
          });
        }

        if (isPromotion && record.referendumStatus === 'failed') {
          alerts.push({
            id,
            type: 'promotionFailed',
            record,
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

const $firstAlert = $alerts.map(alerts => alerts[0] ?? null);

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

// persist({
//   key: 'alertsWereSeen',
//   store: $alertsWereSeen,
//   sync: true,
// });

export const alertsModel = {
  $alerts,
  $firstAlert,

  markAsSeen,
  markAllAsSeen,
};

export type { Alert };
