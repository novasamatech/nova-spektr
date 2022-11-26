import { ComponentMeta, ComponentStory } from '@storybook/react';

import Radio from './Radio';

export default {
  title: 'Radio',
  component: Radio,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Radio>;

const Template: ComponentStory<typeof Radio> = (args) => <Radio {...args} />;

const defaultOptions = [
  { id: 1, value: 1, element: <span>Test 1</span> },
  { id: 2, value: 2, element: <span>Test 2</span> },
];

export const Default = Template.bind({});
Default.args = {
  selected: defaultOptions[1],
  options: defaultOptions,
  onChange: () => {},
};
