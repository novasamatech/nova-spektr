import { Skeleton } from '@/shared/ui-kit';

export const VotingHistoryListPlaceholder = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="flex h-11 items-center justify-between px-2">
          <Skeleton width={70} height={5} />
          <Skeleton width={20} height={5} />
        </div>
      ))}
    </>
  );
};
