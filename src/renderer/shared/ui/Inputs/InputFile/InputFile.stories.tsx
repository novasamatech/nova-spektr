import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { InputFile } from './InputFile';

export default {
  title: 'InputFile',
  component: InputFile,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InputFile>;

const Template: ComponentStory<typeof InputFile> = (args) => <InputFile {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Upload file',
};

export const Invalid = Template.bind({});
Invalid.args = {
  placeholder: 'Upload file',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  placeholder: 'Upload file',
  disabled: true,
};
