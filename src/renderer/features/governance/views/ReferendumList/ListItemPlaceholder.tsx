import { Shimmering } from '@shared/ui';

export const ListItemPlaceholder = () => {
  return (
    <div className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white">
      <div className="flex justify-between gap-x-2">
        <Shimmering width={240} height={20} />
        <Shimmering width={125} height={20} />
      </div>
      <div className="flex justify-between gap-x-6 w-full">
        <Shimmering className="rounded-lg" width={332} height={62} />
        <div className="w-[1px] h-[62px] bg-divider" />
        <Shimmering className="rounded-lg" width={332} height={62} />
      </div>
    </div>
  );
};
