import { ComponentMeta, ComponentStory } from '@storybook/react';

import { OperationResult } from './OperationResult';

export default {
  title: 'Operation Result',
  component: OperationResult,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof OperationResult>;

const Template: ComponentStory<typeof OperationResult> = (args) => <OperationResult {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isOpen: true,
  onClose: () => undefined,
  title: 'Success',
  description: 'Success Success Success Success',
};
