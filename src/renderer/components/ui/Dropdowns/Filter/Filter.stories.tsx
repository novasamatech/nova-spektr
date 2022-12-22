import { ComponentStory, ComponentMeta } from '@storybook/react';

import Filter from './Filter';

export default {
  title: 'Filter',
  component: Filter,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="w-[250px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Filter>;

const Template: ComponentStory<typeof Filter> = (args) => <Filter {...args} />;

const options = [
  { id: '0', value: 'option_1', element: 'label_1' },
  { id: '1', value: 'option_2', element: 'label_2' },
  { id: '2', value: 'option_3', element: 'label_3' },
  { id: '3', value: 'option_4', element: 'label_4' },
];

export const Primary = Template.bind({});
Primary.args = {
  activeIds: [options[1].id, options[3].id],
  placeholder: 'Filter',
  options,
};
