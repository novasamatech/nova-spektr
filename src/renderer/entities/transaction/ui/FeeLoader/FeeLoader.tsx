import { TEST_IDS } from '@/shared/constants';
import { Shimmering } from '@/shared/ui';

type Props = {
  fiatFlag?: boolean;
};

export const FeeLoader = ({ fiatFlag }: Props) => (
  <div className="flex flex-col items-end gap-y-0.5">
    <Shimmering width={90} height={20} data-testid={TEST_IDS.OPERATIONS.FEE_LOADER} />
    {fiatFlag && <Shimmering width={70} height={18} data-testid={TEST_IDS.OPERATIONS.FEE_LOADER} />}
  </div>
);
