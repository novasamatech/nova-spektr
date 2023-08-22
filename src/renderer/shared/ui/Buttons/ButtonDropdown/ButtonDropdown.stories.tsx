import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { ButtonDropdown } from './ButtonDropdown';

const meta: Meta<typeof ButtonDropdown> = {
  title: 'ui/Buttons/ButtonDropdown',
  component: ButtonDropdown,

  decorators: [
    (Story) => (
      <div className="mt-28 w-[280px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ButtonDropdown>;

const Options = [
  { id: 'button1', title: 'Button Option 1', onClick: noop },
  { id: 'button2', title: 'Button Option 2', onClick: noop },
];

const RenderOptions = Options.map(({ id, title, onClick }) => (
  <ButtonDropdown.Item key={id}>
    <button onClick={onClick}>{title}</button>
  </ButtonDropdown.Item>
));

export const Primary: Story = {
  args: {
    title: 'Action Dropdown',
    children: RenderOptions,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Action Dropdown',
    disabled: true,
    children: RenderOptions,
  },
};
