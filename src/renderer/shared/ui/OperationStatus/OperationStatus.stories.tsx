import { ComponentStory, ComponentMeta } from '@storybook/react';

import { OperationStatus } from './OperationStatus';

export default {
  title: 'OperationStatus',
  component: OperationStatus,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof OperationStatus>;

const Template: ComponentStory<typeof OperationStatus> = (args) => <OperationStatus {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Rejected',
  pallet: 'error',
};
