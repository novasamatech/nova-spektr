import { MemoryRouter } from 'react-router-dom';
import { Meta, StoryFn } from '@storybook/react';

import { Icon } from '@renderer/components/ui';
import ButtonLink from './ButtonLink';

export default {
  title: 'ButtonLink',
  component: ButtonLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as Meta<typeof ButtonLink>;

const Template: StoryFn<typeof ButtonLink> = (args) => <ButtonLink {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  to: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
};

export const Prefix = Template.bind({});

Prefix.args = {
  to: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="balance" className="text-white" size={16} />,
};
export const Suffix = Template.bind({});

Suffix.args = {
  to: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  suffixElement: <Icon name="balance" className="text-white" size={16} />,
};
export const Both = Template.bind({});

Both.args = {
  to: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="balance" className="text-white" size={16} />,
  suffixElement: <Icon name="asset" className="text-white" size={16} />,
};

export const OnlyIcon = Template.bind({});
OnlyIcon.args = {
  to: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  className: 'w-max',
  children: <Icon name="balance" className="text-white" size={16} />,
  disabled: false,
};
