import { ComponentMeta, ComponentStory } from '@storybook/react';
import noop from 'lodash/noop';

import { ButtonDropdown } from './ButtonDropdown';

export default {
  title: 'ui/Buttons/ButtonDropdown',
  component: ButtonDropdown,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 w-[280px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof ButtonDropdown>;

const Template: ComponentStory<typeof ButtonDropdown> = (args) => <ButtonDropdown {...args} />;

const Options = [
  { id: 'button1', title: 'Button Option 1', onClick: noop },
  { id: 'button2', title: 'Button Option 2', onClick: noop },
];

const RenderOptions = Options.map(({ id, title, onClick }) => (
  <ButtonDropdown.Item key={id} onClick={onClick}>
    {title}
  </ButtonDropdown.Item>
));

export const Primary = Template.bind({});
Primary.args = {
  title: 'Action Dropdown',
  children: RenderOptions,
};

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'Action Dropdown',
  disabled: true,
  children: RenderOptions,
};
