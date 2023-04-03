import { ComponentMeta, ComponentStory } from '@storybook/react';

import BodyText from '@renderer/components/ui-redesign/Typography/components/BodyText';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';

export default {
  title: 'Redesign/Typography',
  component: TextBase,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof TextBase>;

const BodyTemplate: ComponentStory<typeof TextBase> = (args) => <BodyText {...args} />;

export const Body = BodyTemplate.bind({});
Body.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const CalloutTemplate: ComponentStory<typeof TextBase> = (args) => <CalloutText {...args} />;
export const Callout = CalloutTemplate.bind({});
Callout.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};
