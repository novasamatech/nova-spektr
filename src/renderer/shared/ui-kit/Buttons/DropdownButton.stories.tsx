import { type Meta, type StoryObj } from '@storybook/react';
import { noop } from 'lodash';

import { Icon } from '../../ui';

import { DropdownButton } from './DropdownButton';

const meta: Meta<typeof DropdownButton> = {
  component: DropdownButton,
  title: 'Design System/kit/DropdownButton',
};

export default meta;

type Story = StoryObj<typeof DropdownButton>;

const options = [
  {
    id: '1',
    title: 'Option 1',
    icon: <Icon name="network" size={20} />,
    onClick: noop,
  },
  {
    id: '2',
    title: 'Option 1',
    icon: <Icon name="network" size={20} />,
    onClick: noop,
  },
  {
    id: '3',
    title: 'Option 1',
    icon: <Icon name="network" size={20} />,
    onClick: noop,
  },
];

export const Default: Story = {
  args: {
    title: 'Dropdown button',
    options,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled button',
    disabled: true,
    options,
  },
};
