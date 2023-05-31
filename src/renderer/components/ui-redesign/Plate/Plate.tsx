import { ElementType, PropsWithChildren } from 'react';

import twMerge from '@renderer/shared/utils/twMerge';

type Props = {
  as?: ElementType;
  className?: string;
};

const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={twMerge('p-3 rounded-md bg-white', className)}>{children}</Tag>
);

export default Plate;
