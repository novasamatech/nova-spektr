import { useMemo } from 'react';

import { getExpectedBlockTime, nullable } from '@/shared/lib/utils';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { evidenceService, memberService, useEvidencePeriod } from '@/domains/collectives';
import { useBlockTimestamp } from '@/domains/network';
import {
  useFellowshipMember,
  useFellowshipMemberEvidence,
  useMemberRetentionReferendum,
} from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';

export const DANGER_THRESHOLD_DAYS = 2;
export const WARNING_THRESHOLD_DAYS = 14;
export const APPROACHING_THRESHOLD_DAYS = 30;

export enum RetentionWidgetState {
  WAITING = 'waiting',
  WARNING_APPROACHING = 'warning_approaching',
  WARNING_URGENT = 'warning_urgent',
  CRITICAL_LAST_CALL = 'critical_last_call',
  CRITICAL_EXPIRED = 'critical_expired',
  REPORT_SUBMITTED = 'report_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

type RetentionPeriod = {
  from: BlockHeight;
  to: BlockHeight;
};

export const useRetentionPeriod = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });

  const retentionPeriod = useMemo<RetentionPeriod | null>(() => {
    if (
      nullable(api) ||
      nullable(chain) ||
      nullable(periods) ||
      nullable(member) ||
      !memberService.isCoreMember(member)
    ) {
      return null;
    }

    const from = member.lastProof;
    const length = evidenceService.getDemotionPeriod(member, periods);
    const to = pjsSchema.helpers.toBlockHeight(Number(from) + Number(length));

    return {
      from,
      to,
    };
  }, [api, chain, periods, member]);

  return {
    data: retentionPeriod,
    pending: memberPending || periodsPending,
  };
};

export const useRetentionPeriodDates = () => {
  const api = useFellowshipApi();
  const { data: period } = useRetentionPeriod();

  const { data: fromDate, pending: fromPending } = useBlockTimestamp({
    api,
    blockHeight: period?.from ?? null,
  });
  const { data: toDate, pending: toPending } = useBlockTimestamp({
    api,
    blockHeight: period?.to ?? null,
  });

  return {
    data: { from: fromDate, to: toDate },
    pending: fromPending || toPending,
  };
};

type RetentionState = {
  period: RetentionPeriod;
  leftToEnd: number;
  blockThresholds: {
    danger: number;
    warning: number;
    approaching: number;
  };
  hasRetentionEvidence: boolean;
  hasRetentionReferendum: boolean;
};

export const useRetentionState = () => {
  const api = useFellowshipApi();
  const { data: block, pending: blockPending } = useFellowshipBlock();
  const { data: period, pending: periodPending } = useRetentionPeriod();
  const { data: evidence, pending: evidencePending } = useFellowshipMemberEvidence();
  const { data: hasRetentionReferendum, pending: referendumPending } = useMemberRetentionReferendum();

  const retentionState = useMemo<RetentionState | null>(() => {
    if (nullable(api) || nullable(block) || nullable(period)) {
      return null;
    }

    const leftToEnd = period.to - block;

    const blockTimeMs = getExpectedBlockTime(api).toNumber();
    const msPerDay = 24 * 60 * 60 * 1000;

    return {
      period,
      leftToEnd,
      blockThresholds: {
        danger: Math.ceil((DANGER_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
        warning: Math.ceil((WARNING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
        approaching: Math.ceil((APPROACHING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
      },
      hasRetentionEvidence: evidence?.wish === 'Retention',
      hasRetentionReferendum: Boolean(hasRetentionReferendum),
    };
  }, [api, block, period, evidence, hasRetentionReferendum]);

  return {
    data: retentionState,
    pending: blockPending || periodPending || evidencePending || referendumPending,
  };
};

export const useRetentionWidgetState = () => {
  const { data: retentionState, pending } = useRetentionState();

  const state = useMemo<RetentionWidgetState | null>(() => {
    if (nullable(retentionState)) {
      return null;
    }

    if (retentionState.hasRetentionReferendum) {
      return RetentionWidgetState.REFERENDUM_CREATED;
    }

    if (retentionState.hasRetentionEvidence) {
      return RetentionWidgetState.REPORT_SUBMITTED;
    }

    if (retentionState.leftToEnd < 0) {
      return RetentionWidgetState.CRITICAL_EXPIRED;
    }

    if (retentionState.leftToEnd <= retentionState.blockThresholds.danger) {
      return RetentionWidgetState.CRITICAL_LAST_CALL;
    }

    if (retentionState.leftToEnd <= retentionState.blockThresholds.warning) {
      return RetentionWidgetState.WARNING_URGENT;
    }

    if (retentionState.leftToEnd <= retentionState.blockThresholds.approaching) {
      return RetentionWidgetState.WARNING_APPROACHING;
    }

    return RetentionWidgetState.WAITING;
  }, [retentionState]);

  return { data: state, pending };
};

export const useRetentionRequest = () => {
  const { data: retentionState, pending } = useRetentionWidgetState();

  if (nullable(retentionState)) {
    return { data: false, pending };
  }

  return {
    data:
      retentionState === RetentionWidgetState.WARNING_APPROACHING ||
      retentionState === RetentionWidgetState.WARNING_URGENT ||
      retentionState === RetentionWidgetState.CRITICAL_LAST_CALL,
    pending,
  };
};
