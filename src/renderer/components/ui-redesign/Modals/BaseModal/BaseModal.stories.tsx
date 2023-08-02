import { Meta, StoryFn } from '@storybook/react';

import BaseModal from './BaseModal';

export default {
  title: 'Redesign/Base Modal',
  component: BaseModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof BaseModal>;

const Template: StoryFn<typeof BaseModal> = (args) => <BaseModal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  title: 'Base modal',
  isOpen: true,
  children: (
    <p className="flex flex-col gap-8 p-4">
      <p>webpack building... 99% done plugins webpack-hot-middleware</p>
      <p>webpack built preview in 2605ms</p>
      <p>webpack building... 99% done plugins webpack-hot-middleware</p>
    </p>
  ),
  closeButton: true,
  onClose: () => {},
};
