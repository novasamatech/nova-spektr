import { ComponentMeta } from '@storybook/react';

import Identicon from './Identicon';

export default {
  title: 'Identicon',
  component: Identicon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Identicon>;

// const Template: ComponentStory<typeof Identicon> = (args) => <Identicon {...args} />;

// export const Primary = Template.bind({});
// Primary.args = {
//   label: 'Identicon lable',
// };
//
// export const Disabled = Template.bind({});
// Disabled.args = {
//   label: 'Identicon label',
//   disabled: true,
// };
