import { MemoryRouter } from 'react-router-dom';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from '../../Icon/Icon';
import { ButtonWebLink } from './ButtonWebLink';

export default {
  title: 'ButtonWebLink',
  component: ButtonWebLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as ComponentMeta<typeof ButtonWebLink>;

const Template: ComponentStory<typeof ButtonWebLink> = (args) => <ButtonWebLink {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  href: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
};

export const Prefix = Template.bind({});

Prefix.args = {
  href: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="network" className="text-white" size={16} />,
};
export const Suffix = Template.bind({});

Suffix.args = {
  href: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  suffixElement: <Icon name="network" className="text-white" size={16} />,
};
export const Both = Template.bind({});

Both.args = {
  href: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  children: 'Link',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="network" className="text-white" size={16} />,
  suffixElement: <Icon name="asset" className="text-white" size={16} />,
};

export const OnlyIcon = Template.bind({});
OnlyIcon.args = {
  href: 'test_path',
  variant: 'fill',
  pallet: 'primary',
  className: 'w-max',
  children: <Icon name="network" className="text-white" size={16} />,
  disabled: false,
};
