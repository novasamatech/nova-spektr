import { useMemo } from 'react';

import { useCompletedReferendumTasks } from './useCompletedReferendumTasks';
import { useEvidenceTasks } from './useEvidenceTasks';
import { useMemberEvidenceTasks } from './useMemberEvidenceTasks';
import { useMemberSalaryTasks } from './useMemberSalaryTasks';
import { useOngoingReferendumTasks } from './useOngoingReferendumTasks';

export const useTasks = () => {
  const { data: memberEvidenceTasks, pending: pendingMemberEvidence } = useMemberEvidenceTasks();
  const { data: memberSalaryTasks, pending: pendingMemberSalary } = useMemberSalaryTasks();
  const { data: ongoingTasks, pending: pendingOngoing } = useOngoingReferendumTasks();
  const { data: completedTasks, pending: pendingCompleted } = useCompletedReferendumTasks();

  const { data: evidenceTasks, pending: pendingEvidenceTasks } = useEvidenceTasks();

  const tasks = useMemo(() => {
    const list = [...memberEvidenceTasks, ...memberSalaryTasks, ...evidenceTasks, ...ongoingTasks, ...completedTasks];
    return list.sort((a, b) => b.weight - a.weight);
  }, [memberEvidenceTasks, memberSalaryTasks, evidenceTasks, ongoingTasks, completedTasks]);

  return {
    data: tasks,
    pending: pendingMemberEvidence || pendingMemberSalary || pendingEvidenceTasks || pendingOngoing || pendingCompleted,
  };
};
