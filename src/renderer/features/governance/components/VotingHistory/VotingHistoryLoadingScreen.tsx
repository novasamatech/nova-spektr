import { Loader } from '@shared/ui';

export const VotingHistoryLoadingScreen = () => {
  return (
    <div className="flex items-center justify-center h-40 w-full">
      <Loader color="primary" />
    </div>
  );
};
