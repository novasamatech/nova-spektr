import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Plate } from './Plate';

export default {
  title: 'Plate',
  component: Plate,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Plate>;

const Template: ComponentStory<typeof Plate> = (args) => <Plate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
