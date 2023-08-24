import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { ButtonDropdown } from './ButtonDropdown';

const meta: Meta<typeof ButtonDropdown> = {
  title: 'Design system/Buttons/ButtonDropdown',
  component: ButtonDropdown,
  parameters: {
    controls: { sort: 'requiredFirst' },
  },
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof ButtonDropdown>;

const UiOptions: Story['argTypes'] = {
  className: { control: false },
  children: { control: false },
};

const Options = [
  { id: 'button1', title: 'Button Option 1', onClick: noop },
  { id: 'button2', title: 'Button Option 2', onClick: noop },
];

const RenderOptions = Options.map(({ id, title, onClick }) => (
  <ButtonDropdown.Item key={id} onClick={onClick}>
    {title}
  </ButtonDropdown.Item>
));

export const Playground: Story = {
  args: {
    title: 'Active Dropdown',
    children: RenderOptions,
  },
  argTypes: UiOptions,
};

export const Disabled: Story = {
  render: () => (
    <ButtonDropdown disabled title="Disabled Dropdown">
      {RenderOptions}
    </ButtonDropdown>
  ),
};
