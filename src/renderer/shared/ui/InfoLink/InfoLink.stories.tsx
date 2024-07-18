import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { InfoLink } from './InfoLink';

export default {
  title: 'Info Link',
  component: InfoLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InfoLink>;

const Template: ComponentStory<typeof InfoLink> = (args) => <InfoLink {...args} />;

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
