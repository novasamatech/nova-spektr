import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { LabelHelpBox } from './LabelHelpBox';

export default {
  title: 'LabelHelpBox',
  component: LabelHelpBox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof LabelHelpBox>;

const Template: ComponentStory<typeof LabelHelpBox> = (args) => <LabelHelpBox {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
