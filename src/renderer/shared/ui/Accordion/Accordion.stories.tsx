import { type Meta, type StoryFn } from '@storybook/react';

import { Accordion } from './Accordion';

export default {
  title: 'v1/ui/Accordion',
  component: Accordion,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Accordion>;

const Template: StoryFn<typeof Accordion> = (args) => <Accordion {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isDefaultOpen: false,
  children: (
    <>
      <Accordion.Button>Button</Accordion.Button>
      <Accordion.Content>Hidden content</Accordion.Content>
    </>
  ),
};
