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

export const TriggerContentOverflow: Story = {
  render(args) {
    return (
      <Collapsible {...args}>
        <Collapsible.Trigger>
          <span>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </span>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="h-96 w-full rounded-md bg-green-300" />
        </Collapsible.Content>
      </Collapsible>
    );
  },
};
