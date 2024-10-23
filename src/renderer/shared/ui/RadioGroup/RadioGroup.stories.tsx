import { type Meta, type StoryFn } from '@storybook/react';

import { RadioGroup } from './RadioGroup';

export default {
  title: 'v1/ui/RadioGroup',
  component: RadioGroup,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof RadioGroup>;

const Template: StoryFn<typeof RadioGroup> = (args) => <RadioGroup {...args} />;

const defaultOptions = [
  { id: '1', value: 1, title: 'Test 1' },
  { id: '2', value: 2, title: 'Test 2' },
];

export const Default = Template.bind({});
Default.args = {
  activeId: defaultOptions[1].id,
  options: defaultOptions,
  onChange: () => {},
};
