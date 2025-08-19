import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Icon } from '@/shared/ui';

import { Copy } from './Copy';

const meta: Meta<typeof Copy> = {
  title: 'Design System/kit/Copy',
  component: Copy,
};

export default meta;

type Story = StoryObj<typeof Copy>;

export const Default: Story = {
  args: {
    value: 'Clipboard contents Default',
  },
  render: args => (
    <Copy {...args}>
      <Icon name="copy" size={16} />
    </Copy>
  ),
};

export const WithText: Story = {
  args: {
    value: 'Clipboard contents WithText',
  },
  render: args => (
    <Copy {...args}>
      <span className="text-blue-600 underline">Copy Me</span>
    </Copy>
  ),
};

export const WithOnCopiedCallback: Story = {
  args: {
    value: 'Clipboard contents WithOnCopiedCallback',
  },
  render: args => {
    const onCopied = () => {
      alert('Copied to clipboard: ' + args.value);
    };

    return (
      <Copy {...args} onCopied={onCopied}>
        <span className="flex items-center gap-1">
          Copy Me <Icon name="copy" size={16} />
        </span>
      </Copy>
    );
  },
};
