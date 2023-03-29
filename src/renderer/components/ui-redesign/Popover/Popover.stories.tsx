import { ComponentMeta, ComponentStory } from '@storybook/react';

import Popover from './Popover';

export default {
  title: 'Popover Redesign',
  component: Popover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Popover>;

const Template: ComponentStory<typeof Popover> = (args) => <Popover {...args} />;

export const OnHover = Template.bind({});
OnHover.args = {
  content: 'Staking will automatically start when the next era starts',
  children: <button className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</button>,
};

export const OnClick = Template.bind({});
OnClick.args = {
  content: 'Staking will automatically start when the next era starts',
  shownOnClick: true,
  children: <button className="py-2 px-3 bg-gray-200 w-40 text-center">Click me</button>,
};
