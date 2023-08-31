import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Label } from './Label';

export default {
  title: 'Label',
  component: Label,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Label>;

const Template: ComponentStory<typeof Label> = (args) => <Label {...args} />;

export const Default = Template.bind({});
Default.args = {
  children: '1 of 5',
};

export const Accent = Template.bind({});
Accent.args = {
  pallet: 'accent',
  children: '2 of 5',
};

export const Positive = Template.bind({});
Positive.args = {
  pallet: 'positive',
  children: '3 of 5',
};

export const Negative = Template.bind({});
Negative.args = {
  pallet: 'negative',
  children: '4 of 5',
};

export const Shade = Template.bind({});
Shade.args = {
  pallet: 'shade',
  children: '5 of 5',
};
