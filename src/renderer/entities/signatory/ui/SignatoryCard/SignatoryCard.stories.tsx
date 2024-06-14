import { ComponentStory, ComponentMeta } from '@storybook/react';

import { SignatoryCard } from './SignatoryCard';
import { TEST_ADDRESS } from '@shared/lib/utils';

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
