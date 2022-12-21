import { PropsWithChildren } from 'react';

import { Pallet } from './common/types';
import { Popover } from '@renderer/components/ui';
import { PopoverProps } from '@renderer/components/ui/Popover/Popover';

interface Props extends PopoverProps {
  pallet: Pallet;
}

// TODO: complete this component
const Badge = ({ children, ...popoverProps }: PropsWithChildren<Props>) => {
  return (
    <Popover {...popoverProps}>
      <div className="rounded-2lg bg-amber-400 px-2 py-0.5">{children}</div>
    </Popover>
  );
};

export default Badge;
