import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { DateRangePicker, type DateRangePickerProps } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Design System/kit/DateRangePicker',
  component: DateRangePicker,
  args: {
    placeholder: 'Select date range',
  },
  parameters: {
    layout: 'centered',
  },
  render: function Render(args: DateRangePickerProps) {
    const [value, setValue] = useState<DateRange | undefined>(args.value);

    return <DateRangePicker {...args} value={value} onChange={setValue} />;
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
    value: {
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
