import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { ConfirmModal } from './ConfirmModal';

export default {
  title: 'ConfirmModal',
  component: ConfirmModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ConfirmModal>;

const Template: ComponentStory<typeof ConfirmModal> = (args) => <ConfirmModal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isOpen: true,
  children: <h2>Children content</h2>,
  onClose: () => {},
};
