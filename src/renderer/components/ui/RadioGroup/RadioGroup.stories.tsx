import { ComponentMeta, ComponentStory } from '@storybook/react';

import RadioGroup from './RadioGroup';

export default {
  title: 'RadioGroup',
  component: RadioGroup,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof RadioGroup>;

const Template: ComponentStory<typeof RadioGroup> = (args) => <RadioGroup {...args} />;

const defaultOptions = [
  { id: 1, value: 1, element: <span>Test 1</span> },
  { id: 2, value: 2, element: <span>Test 2</span> },
];

export const Default = Template.bind({});
Default.args = {
  activeId: defaultOptions[1].id,
  options: defaultOptions,
  onChange: () => {},
};

export const Styles = Template.bind({});
Styles.args = {
  activeId: defaultOptions[1].id,
  options: defaultOptions,
  optionClass: 'p-3 rounded-2lg shadow-element bg-shade-2 mb-3 last:mb-0',
  onChange: () => {},
};
