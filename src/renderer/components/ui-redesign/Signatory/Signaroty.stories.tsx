import { ComponentStory, ComponentMeta } from '@storybook/react';

import Signatory from './Signatory';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

export default {
  title: 'Redesign/Signatory',
  component: Signatory,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Signatory>;

const Template: ComponentStory<typeof Signatory> = (args) => <Signatory {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  address: TEST_ADDRESS,
  name: 'John Doe',
};
