import type { Meta, StoryObj } from '@storybook/react';

import { Accordion } from './Accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Accordion',
  component: Accordion,
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Primary: Story = {
  args: {
    isDefaultOpen: false,
    children: (
      <>
        <Accordion.Button>Button</Accordion.Button>
        <Accordion.Content>Hidden content</Accordion.Content>
      </>
    ),
  },
};
