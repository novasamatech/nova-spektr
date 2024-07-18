import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Accordion } from './Accordion';

export default {
  title: 'Accordion',
  component: Accordion,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Accordion>;

const Template: ComponentStory<typeof Accordion> = (args) => <Accordion {...args} />;

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
