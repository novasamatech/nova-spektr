import { type Meta, type StoryFn } from '@storybook/react';

import { ConfirmModal } from './ConfirmModal';

export default {
  title: 'ConfirmModal',
  component: ConfirmModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof ConfirmModal>;

const Template: StoryFn<typeof ConfirmModal> = (args) => <ConfirmModal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isOpen: true,
  children: <h2>Children content</h2>,
  onClose: () => {},
};
