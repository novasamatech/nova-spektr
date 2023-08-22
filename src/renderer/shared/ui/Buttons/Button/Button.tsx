import noop from 'lodash/noop';
import { MouseEvent, ReactNode } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { ButtonStyle, IconStyle, SizeStyle, TextStyle } from './common/constants';
import { Pallet } from './common/types';
import { Icon } from '../../Icon/Icon';
import { IconNames } from '../../Icon/data';

type Props = {
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
  pallet?: Pallet;
  size?: keyof typeof SizeStyle;
  disabled?: boolean;
  icon?: IconNames;
  suffixElement?: ReactNode;
  children?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const Button = ({
  pallet = 'primary',
  type = 'button',
  size = 'md',
  form,
  className,
  disabled,
  icon,
  suffixElement,
  children,
  onClick = noop,
}: Props) => (
  <button
    type={type}
    form={form}
    disabled={disabled}
    className={cnTw(
      'group flex items-center justify-center gap-x-1.5 select-none outline-offset-1',
      SizeStyle[size],
      ButtonStyle[pallet],
      className,
    )}
    onClick={onClick}
  >
    {icon && <Icon name={icon} size={16} className={IconStyle[pallet]} />}
    <span className={TextStyle[pallet]}>{children}</span>
    {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
  </button>
);
