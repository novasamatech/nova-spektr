import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Markdown } from './Markdown';
import example from './Markdown.stories.example.md?raw';

const meta: Meta<typeof Markdown> = {
  title: 'Design System/kit/Markdown',
  component: Markdown,
  args: {
    children: example,
  },
};

export default meta;

type Story = StoryObj<typeof Markdown>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const Cut: Story = {
  args: {
    cut: '500px',
  },
};
