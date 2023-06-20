import { ComponentStory, ComponentMeta } from '@storybook/react';

import { LabelHelpbox } from './LabelHelpbox';

export default {
  title: 'LabelHelpbox',
  component: LabelHelpbox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof LabelHelpbox>;

const Template: ComponentStory<typeof LabelHelpbox> = (args) => <LabelHelpbox {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  label: 'This is simple content',
};
