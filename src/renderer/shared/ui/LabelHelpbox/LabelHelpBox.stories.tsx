import { type Meta, type StoryFn } from '@storybook/react';

import { LabelHelpBox } from './LabelHelpBox';

export default {
  title: 'v1/ui/LabelHelpBox',
  component: LabelHelpBox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof LabelHelpBox>;

const Template: StoryFn<typeof LabelHelpBox> = (args) => <LabelHelpBox {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
