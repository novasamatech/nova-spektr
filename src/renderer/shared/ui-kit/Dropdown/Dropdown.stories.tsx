import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button, Switch } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Design System/kit/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  render: params => {
    return (
      <Dropdown {...params}>
        <Dropdown.Trigger>
          <Button>Dropdown trigger</Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Group label="Section 1">
            <Dropdown.Item>Item 1</Dropdown.Item>
            <Dropdown.Item>Item 2</Dropdown.Item>
          </Dropdown.Group>
          <Dropdown.Group label="Section 2">
            <Dropdown.CheckboxItem checked={true}>Item 4</Dropdown.CheckboxItem>
            <Dropdown.CheckboxItem checked={true}>Item 5</Dropdown.CheckboxItem>
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

export const CheckboxItem: Story = {
  render: params => {
    return (
      <Dropdown {...params}>
        <Dropdown.Trigger>
          <Button>Dropdown trigger</Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.CheckboxItem checked={true}>Checkbox 1</Dropdown.CheckboxItem>
          <Dropdown.CheckboxItem checked={true} disabled>
            Checkbox 2
          </Dropdown.CheckboxItem>
          <Dropdown.CheckboxItem checked={false} disabled>
            Checkbox 3
          </Dropdown.CheckboxItem>
          <Dropdown.CheckboxItem checked={false}>Checkbox 4</Dropdown.CheckboxItem>
        </Dropdown.Content>
      </Dropdown>
    );
  },
};

export const Separator: Story = {
  render: params => {
    return (
      <Dropdown {...params}>
        <Dropdown.Trigger>
          <Button>Dropdown trigger</Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item>Item 1</Dropdown.Item>
          <Dropdown.Item>Item 2</Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item>Item 3</Dropdown.Item>
          <Dropdown.Item>Item 4</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    );
  },
};

export const AdaptiveWidth: Story = {
  args: {
    width: 'trigger',
  },
};
