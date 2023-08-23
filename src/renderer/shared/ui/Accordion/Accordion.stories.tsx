import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Accordion } from './Accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Design system/Accordion',
  component: Accordion,
  decorators: [withVersion('1.0.0')],
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
