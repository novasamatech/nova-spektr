import { StoryFn, Meta } from '@storybook/react';

import SignatoryCard from './SignatoryCard';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';

export default {
  title: 'Redesign/Signatory',
  component: SignatoryCard,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof SignatoryCard>;

const Template: StoryFn<typeof SignatoryCard> = (args) => <SignatoryCard {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  address: TEST_ADDRESS,
  name: 'John Doe',
};
