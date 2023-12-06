import { Menu } from '@headlessui/react';
import { ComponentProps } from 'react';

import { IconButton } from '@shared/ui';
import { DropdownOptions } from '@shared/ui/Dropdowns/Dropdown/common/DropdownOptions';
import { Dropdown } from '@shared/ui/Dropdowns/Dropdown/common/Dropdown';

type IconButtonProps = ComponentProps<typeof IconButton>;
type DropdownOptionsProps = ComponentProps<typeof DropdownOptions>;

type Props = Omit<IconButtonProps, 'onClick'> & DropdownOptionsProps;

export const DropdownIconButton = ({ options, optionsClassName, ...buttonProps }: Props) => {
  const ButtonEl = () => <Menu.Button as={IconButton} {...buttonProps} />;

  return <Dropdown button={ButtonEl} options={options} optionsClassName={optionsClassName} />;
};
