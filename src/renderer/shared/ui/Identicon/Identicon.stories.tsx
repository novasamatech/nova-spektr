import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_ADDRESS } from '@shared/lib/utils';

import { Identicon } from './Identicon';

export default {
  title: 'Identicon',
  component: Identicon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Identicon>;

const Template: StoryFn<typeof Identicon> = (args) => <Identicon {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  size: 50,
  address: TEST_ADDRESS,
};
