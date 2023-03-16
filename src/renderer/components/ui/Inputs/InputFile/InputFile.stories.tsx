import { ComponentMeta, ComponentStory } from '@storybook/react';

import InputFile from './InputFile';

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

export const Label = Template.bind({});
Label.args = {
  label: 'With label',
  placeholder: 'Upload file',
};

export const Invalid = Template.bind({});
Invalid.args = {
  label: 'With invalid',
  placeholder: 'Upload file',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'With disabled label',
  placeholder: 'Upload file',
  disabled: true,
};
