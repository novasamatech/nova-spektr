import { TEST_IDS } from '@/shared/constants';
import { Shimmering } from '@/shared/ui';

type Props = {
  fiatFlag?: boolean;
  testId?: string;
};

export const FeeLoader = ({ fiatFlag, testId = TEST_IDS.OPERATIONS.FEE_LOADER }: Props) => (
  <div className="flex flex-col items-end gap-y-0.5">
    <Shimmering width={90} height={20} testId={testId} />
    {fiatFlag && <Shimmering width={70} height={18} testId={testId} />}
  </div>
);
