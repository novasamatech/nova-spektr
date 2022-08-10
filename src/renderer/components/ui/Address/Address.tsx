import { HTMLAttributes } from 'react';
import Identicon from '@polkadot/react-identicon';
import cn from 'classnames';

import Truncate from '../Truncate/Truncate';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  address: string;
  full?: boolean;
}

const Address = ({ address, className, full = false }: Props) => {
  const theme = 'polkadot';
  const size = 16;

  const fullComponent = (
    <span className={cn('inline align-middle', className)}>
      <Identicon className="align-middle" value={address} size={size} theme={theme} />
      <span className="text-gray-500 text-sm break-all ml-1">{address}</span>
    </span>
  );

  const shortComponent = (
    <div className={cn('flex items-center', className)}>
      <Identicon value={address} size={size} theme={theme} className="mr-1" />
      <Truncate className="text-gray-500 text-sm" ellipsis="..." start={4} end={4} text={address} />
    </div>
  );

  return full ? fullComponent : shortComponent;
};

export default Address;
