/* eslint-disable react/require-default-props */
/* eslint-disable jsx-a11y/label-has-associated-control */
import Identicon from '@polkadot/react-identicon';
import cn from 'classnames';
import { toShortText } from '../../utils/strings';

interface Props {
  address: string;
  className?: string;
  full?: boolean;
}

const Address = ({ address, className = '', full = false }: Props) => {
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
