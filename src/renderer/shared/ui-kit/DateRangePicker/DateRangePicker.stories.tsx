import { type Meta, type StoryObj } from '@storybook/react-vite';

import { DateRangePicker } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Design System/kit/DateRangePicker',
  component: DateRangePicker,
  args: {
    placeholder: 'Select date range',
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
  args: {},
};

export const WithPlaceholder: Story = {
  args: {
    placeholder: 'Choose your dates',
  },
};

export const WithInitialRange: Story = {
  args: {
    defaultValue: {
      from: new Date(2026, 0, 15),
      to: new Date(2026, 0, 20),
    },
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
