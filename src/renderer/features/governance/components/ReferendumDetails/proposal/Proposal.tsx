import { type Proposal as ProposalType } from '@/shared/core';

import { SpendProposal } from './SpendProposal';

type Props = {
  proposal: ProposalType;
};

export const Proposal = ({ proposal }: Props) => {
  switch (proposal.type) {
    case 'Spend':
      return <SpendProposal proposal={proposal} />;
    default:
      return null;
  }
};
