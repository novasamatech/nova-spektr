import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Duration } from './Duration';

const meta: Meta<typeof Duration> = {
  title: 'v1/ui/Duration',
  component: Duration,
  parameters: { actions: { argTypesRegex: '^on.*' } },
};

export default meta;

type Story = StoryObj<typeof Duration>;

export const Primary: Story = {
  args: {
    seconds: 1,
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const element = await canvas.findByTestId('Duration');

    expect(element.textContent).toBe('1 second');
  },
};
