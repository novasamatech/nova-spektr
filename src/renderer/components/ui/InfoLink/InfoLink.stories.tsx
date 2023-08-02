import { StoryFn, Meta } from '@storybook/react';

import InfoLink from './InfoLink';

export default {
  title: 'InfoLink',
  component: InfoLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof InfoLink>;

const Template: StoryFn<typeof InfoLink> = (args) => <InfoLink {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  url: 'https://test.com',
  children: 'This is my link',
};
