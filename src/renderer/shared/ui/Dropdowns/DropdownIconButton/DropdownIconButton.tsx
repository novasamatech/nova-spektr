import { Menu, Transition } from '@headlessui/react';
import { type ComponentProps, Fragment, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

import { IconButton } from '../../Buttons';
import { FootnoteText, Icon } from '../../index';
import { type DropdownIconButtonOption } from '../common/types';

type IconButtonProps = ComponentProps<typeof IconButton>;

type RootProps = {
  className?: string;
} & Omit<IconButtonProps, 'onClick'>;
const DropdownIconButtonRoot = ({ disabled, className, children, ...buttonProps }: PropsWithChildren<RootProps>) => {
  return (
    <Menu>
      {({ open }) => (
        <div className={cnTw('relative', open && 'z-10')}>
          <Menu.Button as="div" className={className}>
            <IconButton disabled={disabled} {...buttonProps} />
          </Menu.Button>
          {children}
        </div>
      )}
    </Menu>
  );
};

type ItemsProps = {
  className?: boolean;
};
const DropdownItems = ({ className, children }: PropsWithChildren<ItemsProps>) => {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items
        as="ul"
        className={cnTw(
          'min-w-max w-full absolute right-0 z-10 p-1 mt-1 rounded border border-token-container-border',
          'bg-token-container-background shadow-card-shadow',
          className,
        )}
      >
        {children}
      </Menu.Items>
    </Transition>
  );
};

type ItemProps = {
  className?: string;
};
const DropdownItem = ({ className, children }: PropsWithChildren<ItemProps>) => {
  return (
    <Menu.Item
      as="li"
      className={cnTw(
        'rounded ui-active:bg-action-background-hover hover:bg-action-background-hover mb-0.5 last:mb-0',
        className,
      )}
    >
      {children}
    </Menu.Item>
  );
};

type OptionProps = {
  option: DropdownIconButtonOption;
};
const DropdownOption = ({ option }: OptionProps) => {
  return (
    <button className="flex items-center gap-x-1.5 w-full p-2" onClick={option.onClick}>
      <Icon name={option.icon} size={20} className="text-icon-accent" />
      <FootnoteText className="text-text-secondary">{option.title}</FootnoteText>
    </button>
  );
};

export const DropdownIconButton = Object.assign(DropdownIconButtonRoot, {
  Items: DropdownItems,
  Item: DropdownItem,
  Option: DropdownOption,
});
