import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_ADDRESS } from '@/shared/lib/utils';

import { SignatoryCard } from './SignatoryCard';

export default {
  title: 'v1/entities/Signatory',
  component: SignatoryCard,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof SignatoryCard>;

const Template: StoryFn<typeof SignatoryCard> = (args) => <SignatoryCard {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: TEST_ADDRESS,
  status: 'SIGNED',
};
