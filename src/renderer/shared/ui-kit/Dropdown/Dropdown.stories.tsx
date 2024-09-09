import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button, Icon, Switch } from '../../ui';
import { Box } from '../Box/Box';

import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'kit/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  render: (params) => {
    return (
      <Dropdown {...params}>
        <Dropdown.Trigger>
          <Button>Trigger</Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item icon={<Icon name="rocket" size={16} />}>Item 1</Dropdown.Item>
          <Dropdown.Item>Item 2</Dropdown.Item>
          <Dropdown.Item>Item 3</Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Group label="Section 2">
            <Dropdown.CheckboxItem checked>Item 4</Dropdown.CheckboxItem>
            <Dropdown.CheckboxItem checked>Item 5</Dropdown.CheckboxItem>
            <Dropdown.CheckboxItem checked={false}>Item 6</Dropdown.CheckboxItem>
          </Dropdown.Group>
        </Dropdown.Content>
      </Dropdown>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {};

export const Controlled: Story = {
  decorators: [
    (Story, { args }) => {
      const [open, onToggle] = useState(false);

      return (
        <Box gap={4}>
          <Switch checked={open} onChange={onToggle}>
            Toggle dropdown
          </Switch>
          <Story args={{ ...args, open, onToggle }} />
        </Box>
      );
    },
  ],
};

export const PreventClosing: Story = {
  args: {
    preventClosing: true,
  },
};
