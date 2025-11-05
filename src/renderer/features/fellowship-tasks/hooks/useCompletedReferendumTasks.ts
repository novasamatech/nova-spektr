import { type CompletedReferendum } from '@/domains/collectives';
import { CompletedReferendumVoting } from '../components/tasks/CompletedReferendumVoting';
import { type TaskDescription } from '../types';

import { useCompletedReferendums } from './useCompletedReferendums';

export const useCompletedReferendumTasks = () => {
  const { data: referendums, pending: pendingReferendums } = useCompletedReferendums();

  const tasks = referendums.map<TaskDescription<{ referendum: CompletedReferendum }>>(referendum => {
    return {
      id: `referendum_completed_${referendum.id}`,
      weight: referendum.id,
      group: 'completed',
      body: CompletedReferendumVoting,
      meta: { referendum, transaction: null, tags: [] },
    };
  });

  return { data: tasks, pending: pendingReferendums };
};
