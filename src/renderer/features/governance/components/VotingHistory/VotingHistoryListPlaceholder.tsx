import { Shimmering } from '@shared/ui';

export const VotingHistoryListPlaceholder = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="flex gap-5 items-center h-11.5">
          <Shimmering height={20} />
          <Shimmering className="basis-32 shrink-0" height={20} />
        </div>
      ))}
    </>
  );
};
