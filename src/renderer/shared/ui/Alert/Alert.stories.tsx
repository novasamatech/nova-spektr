import { type Meta, type StoryFn } from '@storybook/react';

import { Alert } from './Alert';

export default {
  title: 'v1/ui/Alert',
  component: Alert,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Alert>;

const Template: StoryFn<typeof Alert> = (args) => <Alert {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  title: 'Alert title',
  children: (
    <>
      <Alert.Item>Item 1</Alert.Item>
      <Alert.Item>Item 2</Alert.Item>
      <Alert.Item>Item 3</Alert.Item>
    </>
  ),
};
