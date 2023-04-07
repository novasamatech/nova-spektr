import { ComponentStory, ComponentMeta } from '@storybook/react';

import Signatory from './Signatory';

export default {
  title: 'Redesign/Signatory',
  component: Signatory,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Signatory>;

const Template: ComponentStory<typeof Signatory> = (args) => <Signatory {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
  name: 'John Doe',
};
