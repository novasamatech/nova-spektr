import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { VotingModal } from './components/VotingModal';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { votingStatusModel } from './model/votingStatus';

export { votingStatusModel };
export const fellowshipVotingFeature = {
  views: {
    VotingModal,
    VotingButtons,
    WalletVotingInfo,
    VotingConfirmation,
  },
};
