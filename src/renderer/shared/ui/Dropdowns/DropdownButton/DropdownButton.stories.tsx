import { type Meta, type StoryFn } from '@storybook/react';

import { type ButtonDropdownOption } from '../common/types';

import { DropdownButton } from './DropdownButton';

export default {
  title: 'v1/ui/Dropdown Button',
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
  { id: 'button1', title: 'Button Option 1', icon: 'globe', onClick: () => alert('click1') },
  { id: 'button2', title: 'Button Option 2', icon: 'up', onClick: () => alert('click2') },
];

export const Primary = Template.bind({});
Primary.args = {
  title: 'v1/ui/Action Dropdown',
  options,
};

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'v1/ui/Action Dropdown',
  options,
  disabled: true,
};
