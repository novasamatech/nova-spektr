import { ComponentMeta, ComponentStory } from '@storybook/react';

import BaseModal from './BaseModal';

export default {
  title: 'BaseModal',
  component: BaseModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof BaseModal>;

const Template: ComponentStory<typeof BaseModal> = (args) => <BaseModal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  title: 'Base modal',
  isOpen: true,
  onClose: () => {},
};
