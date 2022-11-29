import { ComponentMeta, ComponentStory } from '@storybook/react';

import Dropdown from './Dropdown';

export default {
  title: 'Dropdown',
  component: Dropdown,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Dropdown>;

const Template: ComponentStory<typeof Dropdown> = (args) => <Dropdown {...args} />;

const options = [
  { id: 0, element: 'label_0', value: '0' },
  { id: 1, element: 'label_1', value: '1' },
];

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Select an option',
  options,
  onChange: () => {},
};

export const Selected = Template.bind({});
Selected.args = {
  placeholder: 'Select an option',
  activeId: options[1].id,
  options,
  onChange: () => {},
};

export const Large = Template.bind({});
Large.args = {
  placeholder: 'Select an option',
  activeId: options[1].id,
  options,
  weight: 'lg',
  onChange: () => {},
};
