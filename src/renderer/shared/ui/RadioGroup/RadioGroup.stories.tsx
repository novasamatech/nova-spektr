import { ComponentMeta, ComponentStory } from '@storybook/react';

import RadioGroup from './RadioGroup';

export default {
  title: 'RadioGroup',
  component: RadioGroup,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof RadioGroup>;

const Template: ComponentStory<typeof RadioGroup> = (args) => <RadioGroup {...args} />;

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
