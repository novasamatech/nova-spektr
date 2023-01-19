import { ComponentStory, ComponentMeta } from '@storybook/react';

import Table from './Table';

export default {
  title: 'Table',
  component: Table,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Table>;

const Template: ComponentStory<typeof Table> = (args) => <Table {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Table label',
};
