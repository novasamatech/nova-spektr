import { ComponentStory, ComponentMeta } from '@storybook/react';

import HintList from './HintList';

export default {
  title: 'HintList',
  component: HintList,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof HintList>;

const Template: ComponentStory<typeof HintList> = (args) => <HintList {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
