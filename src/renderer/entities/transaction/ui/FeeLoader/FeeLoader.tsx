import { cnTw } from '@/shared/lib/utils';
import { Shimmering } from '@/shared/ui';

type Props = {
  className?: string;
  fiatFlag?: boolean;
};

export const FeeLoader = ({ fiatFlag, className }: Props) => (
  <div className={cnTw('flex flex-col items-end gap-y-0.5', className)}>
    <Shimmering width={90} height={20} data-testid="fee-loader" />
    {fiatFlag && <Shimmering width={70} height={18} data-testid="fee-loader" />}
  </div>
);
