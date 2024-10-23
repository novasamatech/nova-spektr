import { type Meta, type StoryFn } from '@storybook/react';

import { OperationResult } from './OperationResult';

export default {
  title: 'v1/entities/Operation Result',
  component: OperationResult,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof OperationResult>;

const Template: StoryFn<typeof OperationResult> = (args) => <OperationResult {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isOpen: true,
  onClose: () => undefined,
  title: 'Success',
  description: 'Success Success Success Success',
};
