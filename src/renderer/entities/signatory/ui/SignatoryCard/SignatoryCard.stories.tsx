import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { TEST_ADDRESS } from '@shared/lib/utils';

import { SignatoryCard } from './SignatoryCard';

export default {
  title: 'Signatory',
  component: SignatoryCard,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof SignatoryCard>;

const Template: ComponentStory<typeof SignatoryCard> = (args) => <SignatoryCard {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: TEST_ADDRESS,
  status: 'SIGNED',
};
