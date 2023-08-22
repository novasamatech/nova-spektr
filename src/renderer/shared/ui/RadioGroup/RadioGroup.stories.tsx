import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'RadioGroup',
  component: RadioGroup,
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const defaultOptions = [
  { id: '1', value: 1, title: 'Test 1' },
  { id: '2', value: 2, title: 'Test 2' },
];

export const Primary: Story = {
  args: {
    activeId: defaultOptions[1].id,
    options: defaultOptions,
    onChange: noop,
  },
};
