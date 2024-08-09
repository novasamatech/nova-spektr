import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Loader } from './Loader';

export default {
  title: 'Loader ',
  component: Loader,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mx-auto mt-28 w-[200px] rounded-lg bg-gray-200">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Loader>;

const Template: ComponentStory<typeof Loader> = (args) => <Loader {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  size: 50,
  color: 'primary',
};

export const White = Template.bind({});
White.args = {
  size: 50,
  color: 'white',
};
