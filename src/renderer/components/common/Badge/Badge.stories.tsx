import { ComponentMeta, ComponentStory } from '@storybook/react';

import Badge from './Badge';

export default {
  title: 'Badge',
  component: Badge,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-20 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Badge>;

const Template: ComponentStory<typeof Badge> = (args) => <Badge {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  titleText: 'Popover title',
  content: 'Popover text',
  pallet: 'error',
  children: 'badge text',
};
