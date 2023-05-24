import { Menu } from '@headlessui/react';
import cn from 'classnames';
import React from 'react';
import { Link } from 'react-router-dom';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';

type ButtonProps = React.ComponentProps<typeof Button>;

type OptionBase = {
  id: string;
  title: string;
  iconName: IconNames;
};

type LinkOption = OptionBase & { to: string };
type ButtonOption = OptionBase & { onClick: ButtonProps['onClick'] };

export type ButtonDropdownOption = LinkOption | ButtonOption;

type Props = {
  options: ButtonDropdownOption[];
  title: string;
  disabled?: boolean;
  buttonProps?: Omit<ButtonProps, 'children' | 'suffixElement' | 'onClick' | 'disabled'>;
};

const DropdownButton = ({ options, title, disabled, buttonProps }: Props) => {
  return (
    <Menu>
      {({ open }) => (
        <div className={cn('relative', open && 'z-10')}>
          <Menu.Button
            as={Button}
            disabled={disabled}
            suffixElement={<Icon name={open ? 'up' : 'down'} size={16} className="text-inherit" />}
            {...buttonProps}
          >
            {title}
          </Menu.Button>
          <Menu.Items
            as="ul"
            className={cn(
              'bg-token-container-background z-10 absolute rounded-md border border-token-container-border mt-1',
              'shadow-card-shadow w-max p-1 gap-y-1',
            )}
          >
            {options.map((opt) => (
              <Menu.Item as="li" key={opt.id} className="p-2 hover:bg-action-background-hover">
                {/* TODO maybe try to refactor to avoid duplicating option children */}
                {'to' in opt ? (
                  <Link to={opt.to} className="flex items-center gap-x-1.5">
                    <Icon name={opt.iconName} size={20} className="text-icon-accent p-[3px]" />
                    <FootnoteText className="text-text-secondary">{opt.title}</FootnoteText>
                  </Link>
                ) : (
                  <button className="flex items-center gap-x-1.5" onClick={opt.onClick}>
                    <Icon name={opt.iconName} size={20} className="text-icon-accent" />
                    <FootnoteText className="text-text-secondary">{opt.title}</FootnoteText>
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </div>
      )}
    </Menu>
  );
};

export default DropdownButton;
