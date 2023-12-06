import cn from 'classnames';
import { Menu } from '@headlessui/react';
import { Link } from 'react-router-dom';

import { IconNames } from '@shared/ui/Icon/data';
import { FootnoteText, Icon } from '@shared/ui';
import { DropdownOption } from './types';
import { dropdownUtils } from './utils';

type Props = {
  options: DropdownOption[];
  optionsClassName?: string;
};

export const DropdownOptions = ({ options, optionsClassName }: Props) => (
  <Menu.Items
    as="ul"
    className={cn(
      'w-full p-1 mt-1 z-10 absolute rounded border border-token-container-border min-w-max',
      'bg-token-container-background shadow-card-shadow',
      optionsClassName,
    )}
  >
    {options.map((option) => {
      const optionContent = (
        <>
          {typeof option.icon === 'string' ? (
            <Icon name={option.icon as IconNames} size={20} className="text-icon-accent" />
          ) : (
            option.icon
          )}
          <FootnoteText className="text-text-secondary">{option.title}</FootnoteText>
        </>
      );

      return (
        <Menu.Item
          as="li"
          key={option.id}
          className="rounded ui-active:bg-action-background-hover hover:bg-action-background-hover mb-0.5 last:mb-0"
        >
          {/* FIXME: click from keyboard is ignored */}
          {dropdownUtils.isLinkOption(option) ? (
            <Link to={option.to} className="flex items-center gap-x-1.5 w-full p-2">
              {optionContent}
            </Link>
          ) : (
            <button className="flex items-center gap-x-1.5 w-full p-2" onClick={option.onClick}>
              {optionContent}
            </button>
          )}
        </Menu.Item>
      );
    })}
  </Menu.Items>
);
