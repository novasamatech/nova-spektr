import { type ReactNode } from 'react';

import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Dropdown } from '../Dropdown/Dropdown';

type Props = {
  title: string;
  disabled?: boolean;
  options: {
    id: string | number;
    title: string;
    icon?: ReactNode;
    onClick: () => void;
  }[];
};

export const DropdownButton = ({ title, disabled, options }: Props) => {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        {(open) => (
          <Button
            disabled={disabled}
            className="h-8.5 w-full justify-center py-2"
            suffixElement={<Icon name={open ? 'up' : 'down'} size={16} className="text-inherit" />}
          >
            {title}
          </Button>
        )}
      </Dropdown.Trigger>
      <Dropdown.Content>
        {options.map((option) => (
          <Dropdown.Item key={option.id} onSelect={option.onClick}>
            <div className="flex w-full items-center gap-x-1.5 p-2">
              {option.icon}
              <FootnoteText className="text-text-secondary">{option.title}</FootnoteText>
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
