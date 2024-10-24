import { Menu } from '@headlessui/react';
import { type ComponentProps } from 'react';
import { Link } from 'react-router-dom';

import { cnTw } from '@/shared/lib/utils';
import { Button } from '../../Buttons';
import { Icon } from '../../Icon/Icon';
import { type IconNames } from '../../Icon/data';
import { FootnoteText } from '../../Typography';
import { type ButtonDropdownOption } from '../common/types';

type ButtonProps = ComponentProps<typeof Button>;

type Props = {
  title: string;
  options: ButtonDropdownOption[];
} & Omit<ButtonProps, 'children' | 'suffixElement' | 'onClick'>;

export const DropdownButton = ({ options, title, disabled, className, ...buttonProps }: Props) => {
  const { ref, ...restProps } = buttonProps;

  return (
    <Menu>
      {({ open }) => (
        <div className={cnTw('relative', open && 'z-10')}>
          <Menu.Button
            ref={ref}
            as={Button}
            disabled={disabled}
            suffixElement={<Icon name={open ? 'up' : 'down'} size={16} className="text-inherit" />}
            className={cnTw('justify-center', className)}
            {...restProps}
          >
            {title}
          </Menu.Button>
          <Menu.Items
            as="ul"
            className={cnTw(
              'absolute z-10 mt-1 w-full rounded border border-token-container-border p-1',
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
                  className="mb-0.5 rounded last:mb-0 hover:bg-action-background-hover ui-active:bg-action-background-hover"
                >
                  {/* TODO maybe try to refactor to avoid duplicating option children */}
                  {/* FIXME: click from keyboard is ignored */}
                  {'to' in opt ? (
                    <Link to={opt.to} className="flex w-full items-center gap-x-1.5 p-2">
                      {iconComponent}
                      <FootnoteText className="text-text-secondary">{opt.title}</FootnoteText>
                    </Link>
                  ) : (
                    <button className="flex w-full items-center gap-x-1.5 p-2" onClick={opt.onClick}>
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
};
