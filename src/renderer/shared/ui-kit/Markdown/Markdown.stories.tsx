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

export const OverrideElements: Story = {
  args: {
    overrideElements: {
      h1: () => null,
      h2: ({ children }) => <div className="text-alert-icon-negative font-bold">{children}</div>,
      a: ({ href, children }) => (
        <span className="text-primary-button-background-default underline">
          [LINK: {children}, HREF: {href}]
        </span>
      ),
      code: ({ children }) => <strong className="rounded bg-yellow-200 px-1">{children}</strong>,
    },
  },
};
