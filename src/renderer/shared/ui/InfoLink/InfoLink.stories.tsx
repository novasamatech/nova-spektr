import { type Meta, type StoryFn } from '@storybook/react';

import { InfoLink } from './InfoLink';

export default {
  title: 'v1/ui/Info Link',
  component: InfoLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof InfoLink>;

const Template: StoryFn<typeof InfoLink> = (args) => <InfoLink {...args} />;

export const WithIcon = Template.bind({});
WithIcon.args = {
  url: 'https://test.com',
  children: 'This is my link',
  iconName: 'globe',
};

export const NoIcon = Template.bind({});
NoIcon.args = {
  url: 'https://test.com',
  children: 'This is my link',
};
