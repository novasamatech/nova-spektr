import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InputArea } from './InputArea';

const meta: Meta<typeof InputArea> = {
  title: 'Design system/Inputs/InputArea',
  component: InputArea,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InputArea>;

export const Playground: Story = {
  args: {
    rows: 3,
    maxLength: 120,
    placeholder: 'Max length is 120',
  },
};

export const Filled: Story = {
  render: () => (
    <InputArea
      rows={2}
      value="Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus"
    />
  ),
};

export const Disabled: Story = {
  render: () => <InputArea rows={1} value="This is value" disabled />,
};
