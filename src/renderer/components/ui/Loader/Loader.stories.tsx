import { ComponentMeta, ComponentStory } from '@storybook/react';

import Loader from './Loader';

export default {
  title: 'Loader',
  component: Loader,
  parameters: { actions: { argTypesRegex: '^on.*' } },
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
