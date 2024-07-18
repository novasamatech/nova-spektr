import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { XcmChains } from './XcmChains';

export default {
  title: 'ui/XcmChains',
  component: XcmChains,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof XcmChains>;

const Template: ComponentStory<typeof XcmChains> = (args) => <XcmChains {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainIdFrom: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  chainIdTo: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
};
