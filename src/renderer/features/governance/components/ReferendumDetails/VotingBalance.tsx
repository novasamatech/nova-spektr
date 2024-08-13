import { IconButton } from '@shared/ui';
import { Voted } from '@entities/governance';

type Props = {
  votes: string;
  onInfoClick: VoidFunction;
};

export const VotingBalance = ({ votes, onInfoClick }: Props) => {
  return (
    <div className="flex items-center justify-between">
      <Voted active votes={votes} />
      <IconButton name="info" onClick={onInfoClick} />
    </div>
  );
};
