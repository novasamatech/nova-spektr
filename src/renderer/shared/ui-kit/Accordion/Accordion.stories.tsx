import { type Meta, type StoryObj } from '@storybook/react';

import { Accordion } from './Accordion';

const meta: Meta<typeof Accordion> = {
  component: Accordion,
  title: 'Design System/kit/Accordion',
};

export default meta;

type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render(args) {
    return (
      <Accordion {...args}>
        <Accordion.Trigger>Hello, open me, please</Accordion.Trigger>
        <Accordion.Content>
          <div className="h-96 w-full rounded-md bg-green-300" />
        </Accordion.Content>
      </Accordion>
    );
  },
};

export const StickyTrigger: Story = {
  render(args) {
    return (
      <div className="h-[500px] overflow-auto">
        <Accordion {...args}>
          <Accordion.Trigger sticky>Hello, I&#39;m sticky button</Accordion.Trigger>
          <Accordion.Content>
            <div className="h-[5000px] w-full rounded-md bg-green-300" />
          </Accordion.Content>
        </Accordion>
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
      <Accordion {...args}>
        <Accordion.Trigger>
          <span>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel erat lobortis, tristique erat a,
            fringilla dui. Ut eu nibh nulla. Vivamus ac erat at sem aliquam dapibus. Etiam imperdiet arcu congue justo
            sollicitudin feugiat.
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="h-96 w-full rounded-md bg-green-300" />
        </Accordion.Content>
      </Accordion>
    );
  },
};
