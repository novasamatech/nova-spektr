import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Design system/RadioGroup',
  component: RadioGroup,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const defaultOptions = [
  { id: '1', value: 1, title: 'Test 1' },
  { id: '2', value: 2, title: 'Test 2' },
];

export const Playground: Story = {
  args: {
    activeId: defaultOptions[1].id,
    options: defaultOptions,
    onChange: noop,
  },
};
