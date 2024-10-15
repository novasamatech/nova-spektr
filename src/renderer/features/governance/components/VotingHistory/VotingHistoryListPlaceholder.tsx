import { Shimmering } from '@/shared/ui';

export const VotingHistoryListPlaceholder = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="flex h-11.5 items-center gap-5">
          <Shimmering height={20} />
          <Shimmering className="shrink-0 basis-32" height={20} />
        </div>
      ))}
    </>
  );
};
