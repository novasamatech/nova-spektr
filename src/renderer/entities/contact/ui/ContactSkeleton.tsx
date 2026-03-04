import { Skeleton } from '@/shared/ui-kit';

export const ContactSkeleton = () => (
  <div className="flex flex-col gap-y-2.5 rounded-md bg-white p-3">
    <div className="flex items-center gap-x-2">
      <Skeleton circle width={5} />
      <div className="flex flex-col gap-y-1">
        <Skeleton width={24} height={3.5} />
        <Skeleton width={40} height={3} />
      </div>
    </div>
    <div className="flex gap-x-1">
      <Skeleton width={14} height={5} />
      <Skeleton width={20} height={5} />
      <Skeleton width={16} height={5} />
    </div>
  </div>
);
