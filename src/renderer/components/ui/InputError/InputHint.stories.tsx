import { ComponentMeta } from '@storybook/react';

import InputHint from './InputHint';

export default {
  title: 'InputError',
  component: InputHint,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InputHint>;

// const Template: ComponentStory<typeof InputHint> = (args) => <InputHint {...args} />;

// export const Primary = Template.bind({});
// Primary.args = {
//   placeholder: 'Test input',
// };
