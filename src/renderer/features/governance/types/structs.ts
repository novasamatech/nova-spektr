import { Referendum, VotingThreshold } from '@shared/core';

export type AggregatedReferendum<T extends Referendum = Referendum> = {
  referendum: T;
  title: string | null;
  approvalThreshold: VotingThreshold | null;
  supportThreshold: VotingThreshold | null;
};
