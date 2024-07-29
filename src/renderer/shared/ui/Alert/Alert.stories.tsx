import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Alert } from './Alert';

export default {
  title: 'Alert',
  component: Alert,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Alert>;

const Template: ComponentStory<typeof Alert> = (args) => <Alert {...args} />;

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
