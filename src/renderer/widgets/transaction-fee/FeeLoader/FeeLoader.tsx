import { TEST_IDS } from '@/shared/constants';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  fiatFlag?: boolean;
  testId?: string;
};

export const FeeLoader = ({ fiatFlag, testId = TEST_IDS.OPERATIONS.FEE_LOADER }: Props) => (
  <div className="flex flex-col items-end gap-y-0.5">
    <Skeleton width="90px" height={5} testId={testId} />
    {fiatFlag && <Skeleton width="70px" height="18px" testId={testId} />}
  </div>
);
