import { type Meta, type StoryFn } from '@storybook/react';

import { OperationStatus } from './OperationStatus';

export default {
  title: 'OperationStatus',
  component: OperationStatus,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof OperationStatus>;

const Template: StoryFn<typeof OperationStatus> = (args) => <OperationStatus {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Rejected',
  pallet: 'error',
};
