import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Box } from '../Box/Box';

import { Timeout } from './Timeout';

const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60;
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;

const meta: Meta<typeof Timeout> = {
  title: 'Design System/kit/Timeout',
  component: Timeout,
  args: {
    secondsToEnd: DAY_IN_SECONDS,
    variant: 'idle',
  },
  decorators: [
    Story => (
      <Box width="500px">
        <Story />
      </Box>
    ),
    (Story, { args }) => {
      return <Story args={{ ...args }} />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Timeout>;

export const Default: Story = {
  args: {},

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const duration = await canvas.findByTestId<HTMLElement>('Duration');
    expect(duration.textContent).toEqual('1 day');
  },
};

export const Short: Story = {
  args: {
    shortDateFormat: true,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const duration = await canvas.findByTestId<HTMLElement>('Duration');
    expect(duration.textContent).toEqual('1d');
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    secondsToEnd: HOUR_IN_SECONDS,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const duration = await canvas.findByTestId<HTMLElement>('Duration');
    expect(duration.textContent).toEqual('1 hour');
  },
};

export const Urgent: Story = {
  args: {
    variant: 'urgent',
    secondsToEnd: MINUTE_IN_SECONDS,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const duration = await canvas.findByTestId<HTMLElement>('Duration');
    expect(duration.textContent).toEqual('1 minute');
  },
};

export const Expired: Story = {
  args: {
    secondsToEnd: 0,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const span = await canvas.findByTestId<HTMLSpanElement>('ExpiredMsg');
    expect(span.textContent).toEqual('Expired');
  },
};

export const IconWithCustomText: Story = {
  args: { secondsToEnd: 0, text: 'Time is up' },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const span = await canvas.findByTestId<HTMLSpanElement>('ExpiredMsg');
    expect(span.textContent).toEqual('Time is up');
  },
};

export const IconTextHidden: Story = {
  args: { secondsToEnd: 0, hideIconText: true },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const span = canvas.queryByTestId('ExpiredMsg');
    expect(span).toBeNull();
  },
};
