import { type Meta, type StoryFn } from '@storybook/react-vite';

import { Plate } from './Plate';

export default {
  title: 'v1/ui/Plate',
  component: Plate,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Plate>;

const Template: StoryFn<typeof Plate> = (args) => <Plate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
