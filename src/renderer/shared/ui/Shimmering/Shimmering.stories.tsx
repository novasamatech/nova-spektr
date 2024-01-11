import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Shimmering } from './Shimmering';

export default {
  title: 'Shimmering',
  component: Shimmering,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Shimmering>;

const Template: ComponentStory<typeof Shimmering> = (args) => <Shimmering {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  width: 200,
  height: 40,
};

export const Height = Template.bind({});
Height.args = {
  height: 40,
};
