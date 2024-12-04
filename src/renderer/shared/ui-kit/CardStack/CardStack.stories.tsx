import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '../Box/Box';

import { CardStack } from './CardStack';

const meta: Meta<typeof CardStack> = {
  component: CardStack,
  title: 'Design System/kit/CardStack',
};

export default meta;

type Story = StoryObj<typeof CardStack>;

export const Default: Story = {
  render(args) {
    return (
      <div className="flex h-[450px] w-full justify-center bg-gray-100 pt-2">
        <Box width="600px">
          <CardStack {...args}>
            <CardStack.Trigger>Hello, open me, please</CardStack.Trigger>
            <CardStack.Content>
              <ul className="flex flex-col gap-y-4">
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
              </ul>
            </CardStack.Content>
          </CardStack>
        </Box>
      </div>
    );
  },
};

export const StickyTrigger: Story = {
  render(args) {
    return (
      <div className="flex h-[200px] w-full justify-center overflow-auto">
        <Box width="300px">
          <CardStack {...args}>
            <CardStack.Trigger sticky>Hello, I&#39;m sticky button</CardStack.Trigger>
            <CardStack.Content>
              <ul className="flex flex-col gap-y-4 bg-green-100">
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
                <li className="rounded p-2">My text</li>
              </ul>
            </CardStack.Content>
          </CardStack>
        </Box>
      </div>
    );
  },
};
