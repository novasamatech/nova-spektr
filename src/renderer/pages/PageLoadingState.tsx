import { Loader } from '@/shared/ui';

export const PageLoadingState = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Loader color="primary" size={32} />
    </div>
  );
};
