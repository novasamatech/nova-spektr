import { MemoryRouter } from 'react-router-dom';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ButtonLink } from './ButtonLink';

export default {
  title: 'ui/Buttons/ButtonLink',
  component: ButtonLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as ComponentMeta<typeof ButtonLink>;

const Template: ComponentStory<typeof ButtonLink> = (args) => <ButtonLink {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  to: 'test_path',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
};

export const Prefix = Template.bind({});

Prefix.args = {
  to: 'test_path',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  icon: 'chat',
};

export const Medium = Template.bind({});

Medium.args = {
  to: 'test_path',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  size: 'md',
  icon: 'chat',
};

export const Small = Template.bind({});

Small.args = {
  to: 'test_path',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  size: 'sm',
  icon: 'chat',
};
