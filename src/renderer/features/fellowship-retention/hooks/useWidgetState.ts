import { useMemo } from 'react';

import { getExpectedBlockTime, nullable } from '@/shared/lib/utils';
import { useBlock } from '@/domains/network';
import { useFellowshipMemberEvidence, useMemberRetentionReferendum } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipNetwork } from '@/aggregates/fellowship-network';

import { useRetentionPeriod } from './useRetentionPeriod';

export enum RetentionWidgetState {
  WAITING = 'waiting',
  WARNING_APPROACHING = 'warning_approaching',
  WARNING_URGENT = 'warning_urgent',
  CRITICAL_LAST_CALL = 'critical_last_call',
  CRITICAL_EXPIRED = 'critical_expired',
  REPORT_SUBMITTED = 'report_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

// Time thresholds in days (for reference and UI display)
export const DANGER_THRESHOLD_DAYS = 2;
export const WARNING_THRESHOLD_DAYS = 14;
export const APPROACHING_THRESHOLD_DAYS = 30;

export const useWidgetState = () => {
  const api = useFellowshipApi();

  const { data: block, pending: blockPending } = useBlock(api);

  const network = useFellowshipNetwork();
  const { data: hasRetentionReferendum, pending: referendumPending } = useMemberRetentionReferendum();
  const { data: hasRetentionEvidence, pending: evidencePending } = useFellowshipMemberEvidence();

  const { data: retentionPeriod, pending: retentionPeriodPending } = useRetentionPeriod();

  const blocksLeftToEndPeriod = useMemo(() => {
    if (nullable(retentionPeriod) || nullable(block)) return null;

    return retentionPeriod.to - block;
  }, [retentionPeriod, block]);

  const blockThresholds = useMemo(() => {
    if (nullable(network)) return null;

    const blockTimeMs = getExpectedBlockTime(network.api).toNumber();
    const msPerDay = 24 * 60 * 60 * 1000;

    return {
      danger: Math.ceil((DANGER_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
      warning: Math.ceil((WARNING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
      approaching: Math.ceil((APPROACHING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
    };
  }, [network]);

  const state = useMemo(() => {
    if (nullable(blocksLeftToEndPeriod) || nullable(blockThresholds)) return null;

    if (hasRetentionReferendum) {
      return RetentionWidgetState.REFERENDUM_CREATED;
    }

    if (hasRetentionEvidence) {
      return RetentionWidgetState.REPORT_SUBMITTED;
    }

    if (blocksLeftToEndPeriod < 0) {
      return RetentionWidgetState.CRITICAL_EXPIRED;
    }

    if (blocksLeftToEndPeriod <= blockThresholds.danger) {
      return RetentionWidgetState.CRITICAL_LAST_CALL;
    }

    if (blocksLeftToEndPeriod <= blockThresholds.warning) {
      return RetentionWidgetState.WARNING_URGENT;
    }

    if (blocksLeftToEndPeriod <= blockThresholds.approaching) {
      return RetentionWidgetState.WARNING_APPROACHING;
    }

    return RetentionWidgetState.WAITING;
  }, [blocksLeftToEndPeriod, blockThresholds, hasRetentionReferendum, hasRetentionEvidence]);

  return {
    data: state,
    pending: blockPending || retentionPeriodPending || evidencePending || referendumPending,
  };
};
