import { HeaderTitleText, Shimmering } from '@/shared/ui';

export const ListItemPlaceholder = () => {
  return (
    <div className="flex w-full flex-col gap-y-3 rounded-md bg-white p-3">
      <div className="flex justify-between gap-x-2">
        <Shimmering width={240} height={20} />
        <Shimmering width={125} height={20} />
      </div>
      <div className="flex w-full justify-between gap-x-6">
        <HeaderTitleText>
          <Shimmering className="rounded-lg" width="28ch" height="1em" />
        </HeaderTitleText>
        <div className="h-full w-[1px] bg-divider" />
        <HeaderTitleText>
          <Shimmering className="rounded-lg" width="28ch" height="1em" />
        </HeaderTitleText>
      </div>
    </div>
  );
};
