import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { BodyText, Switch } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Design System/kit/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    width: 200,
    height: 40,
  },
};

export const AsWrapper: Story = {
  decorators: [
    (Story, { args }) => {
      const [active, setActive] = useState(args.active);

      return (
        <Box gap={4} width="fit-content">
          <Switch checked={active} onChange={setActive}>
            Toggle active state
          </Switch>
          {/* @ts-expect-error Props */}
          <Story args={{ ...args, active }} />
        </Box>
      );
    },
  ],
  args: {
    active: true,
    fullWidth: false,
    children: <BodyText>Hello world</BodyText>,
  },
};

export const AsWrapperForMultiple: Story = {
  decorators: [
    (Story, { args }) => {
      const [active, setActive] = useState(args.active);

      return (
        <Box gap={4} width="fit-content">
          <Switch checked={active} onChange={setActive}>
            Toggle active state
          </Switch>
          {/* @ts-expect-error Props */}
          <Story args={{ ...args, active }} />
        </Box>
      );
    },
  ],
  args: {
    active: true,
    fullWidth: false,
    children: [<BodyText key={1}>Hello world 1</BodyText>, <BodyText key={2}>Hello world 2</BodyText>],
  },
};
