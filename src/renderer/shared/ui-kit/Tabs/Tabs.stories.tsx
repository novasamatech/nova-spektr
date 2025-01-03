import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  title: 'Design System/kit/Tabs',
  decorators: [
    (Story, { args }) => {
      const [value, onChange] = useState(args.value);

      return <Story args={{ ...args, value, onChange }} />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    value: '1',
  },
  render(args) {
    return (
      <Tabs {...args}>
        <Tabs.List>
          <Tabs.Trigger value="1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="2">Tab 2</Tabs.Trigger>
          <Tabs.Trigger value="3">Tab 3</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="1">Content for tab 1</Tabs.Content>
        <Tabs.Content value="2">Content for tab 2</Tabs.Content>
        <Tabs.Content value="3">Content for tab 3</Tabs.Content>
      </Tabs>
    );
  },
};
