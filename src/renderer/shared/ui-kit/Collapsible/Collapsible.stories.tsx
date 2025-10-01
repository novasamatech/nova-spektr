import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Collapsible } from './Collapsible';

const meta: Meta<typeof Collapsible> = {
  component: Collapsible,
  title: 'Design System/kit/Collapsible',
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {
  render(args) {
    return (
      <Collapsible {...args}>
        <Collapsible.Trigger>Hello, open me, please</Collapsible.Trigger>
        <Collapsible.Content>
          <div className="h-96 w-full rounded-md bg-green-300" />
        </Collapsible.Content>
      </Collapsible>
    );
  },
};

export const StickyTrigger: Story = {
  render(args) {
    return (
      <div className="h-[500px] overflow-auto">
        <Collapsible {...args}>
          <Collapsible.Trigger>Hello, I&#39;m sticky button</Collapsible.Trigger>
          <Collapsible.Content>
            <div className="h-[5000px] w-full rounded-md bg-green-300" />
          </Collapsible.Content>
        </Collapsible>
      </div>
    );
  },
};

/**
 * `text-overflow: ellipsis` and `display: flex` don't play well together, this
 * story highlights overflow behavior.
 */
export const TriggerContentOverflow: Story = {
  render(args) {
    return (
      <Collapsible {...args}>
        <Collapsible.Trigger>
          <span>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel erat lobortis, tristique erat a,
            fringilla dui. Ut eu nibh nulla. Vivamus ac erat at sem aliquam dapibus. Etiam imperdiet arcu congue justo
            sollicitudin feugiat.
          </span>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="h-96 w-full rounded-md bg-green-300" />
        </Collapsible.Content>
      </Collapsible>
    );
  },
};
