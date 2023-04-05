import { ComponentMeta, ComponentStory } from '@storybook/react';

import BaseModal from './BaseModal';

export default {
  title: 'BaseModal Redesign',
  component: BaseModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof BaseModal>;

const Template: ComponentStory<typeof BaseModal> = (args) => <BaseModal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  title: 'Base modal',
  isOpen: true,
  children: (
    <p>
      webpack building... 99% done plugins webpack-hot-middleware
      <br />
      webpack built preview 9c254e098227eeff8fe0 in 2605ms
    </p>
  ),
  closeButton: true,
  onClose: () => {},
};
