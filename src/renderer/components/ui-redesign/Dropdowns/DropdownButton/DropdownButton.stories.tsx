import { Meta, StoryFn } from '@storybook/react';

import DropdownButton, { ButtonDropdownOption } from './DropdownButton';

export default {
  title: 'Redesign/Dropdown Button',
  component: DropdownButton,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 w-[280px]">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof DropdownButton>;

const Template: StoryFn<typeof DropdownButton> = (args) => <DropdownButton {...args} />;

const options: ButtonDropdownOption[] = [
  { id: 'button1', title: 'Button Option 1', iconName: 'globe', onClick: () => alert('click1') },
  { id: 'button2', title: 'Button Option 2', iconName: 'arrowUp', onClick: () => alert('click2') },
];

export const Primary = Template.bind({});
Primary.args = {
  title: 'Action Dropdown',
  options,
};

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'Action Dropdown',
  options,
  disabled: true,
};
