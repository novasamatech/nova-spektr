import cn from 'classnames';
import { Menu } from '@headlessui/react';
import { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { FootnoteText } from '../../Typography';
import { Icon } from '../../Icon/Icon';
import { IconNames } from '../../Icon/data';
import { Button } from '../../Buttons';
import { cnTw } from '@shared/lib/utils';

type ButtonProps = ComponentProps<typeof Button>;

type OptionBase = {
  id: string;
  title: string;
  icon: IconNames | ReactNode;
};

type LinkOption = OptionBase & { to: string };
type ButtonOption = OptionBase & { onClick: ButtonProps['onClick'] };

export type ButtonDropdownOption = LinkOption | ButtonOption;

type Props = {
  title: string;
  options: ButtonDropdownOption[];
} & Omit<ButtonProps, 'children' | 'suffixElement' | 'onClick'>;

export const DropdownButton = ({ options, title, disabled, className, ...buttonProps }: Props) => (
  <Menu>
    {({ open }) => (
      <div className={cn('relative', open && 'z-10')}>
        <Menu.Button
          as={Button}
          disabled={disabled}
          suffixElement={<Icon name={open ? 'up' : 'down'} size={16} className="text-inherit" />}
          className={cnTw('justify-center', className)}
          {...buttonProps}
        >
          {title}
        </Menu.Button>
        <Menu.Items
          as="ul"
          className={cn(
            'w-full p-1 mt-1 z-10 absolute rounded border border-token-container-border',
            'bg-token-container-background shadow-card-shadow',
          )}
        >
          {options.map((opt) => {
            const iconComponent =
              typeof opt.icon === 'string' ? (
                <Icon name={opt.icon as IconNames} size={20} className="text-icon-accent" />
              ) : (
                opt.icon
              );

            return (
              <Menu.Item
                as="li"
                key={opt.id}
                className="rounded ui-active:bg-action-background-hover hover:bg-action-background-hover mb-0.5 last:mb-0"
              >
                {/* TODO maybe try to refactor to avoid duplicating option children */}
                {/* FIXME: click from keyboard is ignored */}
                {'to' in opt ? (
                  <Link to={opt.to} className="flex items-center gap-x-1.5 w-full p-2">
                    {iconComponent}
                    <FootnoteText className="text-text-secondary">{opt.title}</FootnoteText>
                  </Link>
                ) : (
                  <button className="flex items-center gap-x-1.5 w-full p-2" onClick={opt.onClick}>
                    {iconComponent}
                    <FootnoteText className="text-text-secondary">{opt.title}</FootnoteText>
                  </button>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </div>
    )}
  </Menu>
);
