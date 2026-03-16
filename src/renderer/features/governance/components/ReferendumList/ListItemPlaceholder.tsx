import { HeaderTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

export const ListItemPlaceholder = () => {
  return (
    <div className="flex w-full flex-col gap-y-3 rounded-md bg-card-background p-3">
      <div className="flex justify-between gap-x-2">
        <Skeleton width="240px" height="18px" />
        <Skeleton width="125px" height="18px" />
      </div>
      <div className="flex w-full justify-between gap-x-6">
        <HeaderTitleText>
          <Skeleton width="28ch" height="22px" />
        </HeaderTitleText>
        <div className="h-full w-px bg-divider" />
        <HeaderTitleText>
          <Skeleton width="28ch" height="22px" />
        </HeaderTitleText>
      </div>
      <div></div>
    </div>
  );
};
