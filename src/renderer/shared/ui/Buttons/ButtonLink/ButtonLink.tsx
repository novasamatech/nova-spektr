import { Link } from 'react-router-dom';

import { cnTw } from '@renderer/shared/lib/utils';
import { Disabled, IconStyle, SizeStyle, TextStyle } from './common/constants';
import { Icon } from '../../Icon/Icon';
import { IconNames } from '../../Icon/data';

type Props = {
  to: string;
  remote?: boolean;
  className?: string;
  size?: keyof typeof SizeStyle;
  disabled?: boolean;
  icon?: IconNames;
  children?: string;
  callback?: () => void;
};

export const ButtonLink = ({ to, remote, className, size = 'md', disabled, icon, callback, children }: Props) => {
  const wrapperClass = cnTw(
    'group flex items-center justify-center gap-x-1.5 select-none outline-offset-1',
    disabled && 'pointer-events-none',
    SizeStyle[size],
    className,
  );

  const getContent = (isDisabled = false) => {
    const disabledClass = isDisabled && Disabled;

    return (
      <>
        {icon && <Icon name={icon} size={20} className={cnTw(IconStyle, disabledClass)} />}
        <span className={cnTw(TextStyle[size], disabledClass)}>{children}</span>
      </>
    );
  };

  if (disabled) {
    return <div className={wrapperClass}>{getContent(true)}</div>;
  }

  if (remote) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={wrapperClass}>
        {getContent()}
      </a>
    );
  }

  return (
    <Link to={to} className={wrapperClass} onClick={callback}>
      {getContent()}
    </Link>
  );
};
