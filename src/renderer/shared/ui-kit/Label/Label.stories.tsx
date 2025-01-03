import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '../Box/Box';

import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'Design System/kit/Label',
  component: Label,
  args: {
    children: '00:00 or text',
  },
};

export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    variant: 'blue',
  },
};

export const Variants: Story = {
  render({ children }) {
    return (
      <Box gap={2}>
        <Label variant="red">{children}</Label>
        <Label variant="darkRed">{children}</Label>
        <Label variant="orange">{children}</Label>
        <Label variant="green">{children}</Label>
        <Label variant="darkGreen">{children}</Label>
        <Label variant="lightBlue">{children}</Label>
        <Label variant="blue">{children}</Label>
        <Label variant="purple">{children}</Label>
        <Label variant="darkGray">{children}</Label>
        <Label variant="gray">{children}</Label>
      </Box>
    );
  },
};

export const Overflow: Story = {
  args: {
    variant: 'blue',
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas a.',
  },
  decorators: [
    Story => (
      <Box width="150px">
        <Story />
      </Box>
    ),
  ],
};
