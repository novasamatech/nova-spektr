import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InfoPopover } from './InfoPopover';

const meta: Meta<typeof InfoPopover> = {
  title: 'Design system/InfoPopover',
  component: InfoPopover,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InfoPopover>;

const UiOptions: Story['argTypes'] = {
  className: { control: false },
  children: { control: false },
  buttonClassName: { control: false },
  position: { control: false },
  offsetPx: { control: false },
  containerClassName: { control: false },
};

export const Playground: Story = {
  args: {
    children: 'click me',
    data: [
      {
        title: 'address',
        items: [{ value: 'some text', id: '1' }],
      },
      { title: 'id', items: [{ value: 'item_value', id: '2' }] },
      {
        title: 'links',
        items: [
          { id: '3', value: <span>link_1</span> },
          { id: '4', value: <span>link_2</span> },
        ],
      },
    ],
  },
  argTypes: UiOptions,
};
