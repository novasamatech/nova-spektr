import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Separator } from './Separator';

export default {
  title: 'Separator',
  component: Separator,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Separator>;

const Template: ComponentStory<typeof Separator> = (args) => <Separator {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  text: 'Hello world',
};
