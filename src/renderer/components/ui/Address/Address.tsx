import { HTMLAttributes } from 'react';
import Identicon from '@polkadot/react-identicon';
import cn from 'classnames';

import { toShortText } from '@renderer/utils/strings';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  address: string;
  full?: boolean;
}

const Address = ({ address, className, full = false }: Props) => {
  const theme = 'polkadot';
  const size = 16;

  return (
    <span className={cn('inline align-middle', className)}>
      <Identicon className="align-middle" value={address} size={size} theme={theme} />
      <span className="font-mono text-gray-500 text-sm break-all ml-1">{full ? address : toShortText(address)}</span>
    </span>
  );
};

export default Address;
