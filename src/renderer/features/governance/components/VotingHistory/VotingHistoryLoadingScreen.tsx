import { Loader } from '@shared/ui';

export const VotingHistoryLoadingScreen = () => {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <Loader color="primary" />
    </div>
  );
};
