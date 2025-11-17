import { useGate, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import {
  type Evidence,
  type FeedRecord,
  type Member,
  type Referendum,
  trackService,
  useTracks,
} from '@/domains/collectives';
import {
  useFellowshipMember,
  useFellowshipMemberEvidence,
  useMemberPromotionReferendum,
  useMemberRetentionReferendum,
} from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { alertsModel } from '../model/alerts';
import { type Alert } from '../types';

import { useMemberFeed } from './useMemberFeed';

const getEvidenceAlertId = (memberEvidence: Evidence, referendum: Referendum) => {
  return `${memberEvidence.hash}-${referendum.id}`;
};

const useEvidenceAlert = (): Alert[] => {
  const alertsWereSeen = useUnit(alertsModel.$alertsWereSeen);

  const { data: memberEvidence } = useFellowshipMemberEvidence();
  const { data: promotionReferendum } = useMemberPromotionReferendum();
  const { data: retentionReferendum } = useMemberRetentionReferendum();

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
};

const getFeedAlertId = (record: FeedRecord, member: Member) => {
  return `${record.type}-${record.block}-${member.accountId}`;
};

const useFeedAlerts = () => {
  const alertsWereSeen = useUnit(alertsModel.$alertsWereSeen);

  const api = useFellowshipApi();
  const { data: member } = useFellowshipMember();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: feedList } = useMemberFeed();

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
};

export const useAlert = () => {
  const evidenceAlerts = useEvidenceAlert();
  const feedAlerts = useFeedAlerts();

  const alerts = useMemo(() => [...evidenceAlerts, ...feedAlerts], [evidenceAlerts, feedAlerts]);

  useGate(alertsModel.gate, alerts);

  return alerts.at(0) ?? null;
};
