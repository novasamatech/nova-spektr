import { Menu } from '@headlessui/react';
import { ComponentProps } from 'react';

import { Button, Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { DropdownOptions } from '@shared/ui/Dropdowns/Dropdown/common/DropdownOptions';
import { Dropdown } from '@shared/ui/Dropdowns/Dropdown/common/Dropdown';

type ButtonProps = ComponentProps<typeof Button>;
type DropdownOptionsProps = ComponentProps<typeof DropdownOptions>;

type Props = {
  title: string;
} & Omit<ButtonProps, 'children' | 'suffixElement' | 'onClick'> &
  DropdownOptionsProps;

export const DropdownButton = ({ options, title, disabled, className, optionsClassName, ...buttonProps }: Props) => {
  const ButtonEl = (open: boolean) => (
    <Menu.Button
      as={Button}
      disabled={disabled}
      suffixElement={<Icon name={open ? 'up' : 'down'} size={16} className="text-inherit" />}
      className={cnTw('justify-center', className)}
      {...buttonProps}
    >
      {title}
    </Menu.Button>
  );

  return <Dropdown button={ButtonEl} options={options} optionsClassName={optionsClassName} />;
};
