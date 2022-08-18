import { ComponentMeta, ComponentStory } from '@storybook/react';

import DropDown from './DropDown';

export default {
  title: 'DropDown',
  component: DropDown,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof DropDown>;

const Template: ComponentStory<typeof DropDown> = (args) => <DropDown {...args} />;

const options = [
  { label: 'label_0', value: '0' },
  { label: 'label_1', value: '1' },
];

export const Default = Template.bind({});
Default.args = {
  placeholder: 'Select an option',
  options,
  onSelected: () => {},
};

export const Selected = Template.bind({});
Selected.args = {
  placeholder: 'Select an option',
  selected: options[1],
  options,
  onSelected: () => {},
};
