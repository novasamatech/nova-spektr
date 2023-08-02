import { Meta, StoryFn } from '@storybook/react';

import { Icon, Identicon } from '@renderer/components/ui';
import Combobox from './Combobox';

export default {
  title: 'Combobox',
  component: Combobox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 w-[280px]">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof Combobox>;

const Template: StoryFn<typeof Combobox> = (args) => <Combobox {...args} />;

const data = [
  { value: 'Durward Reynolds', address: '13mK8AssyPekT5cFuYQ7ijKNXcjHPq8Gnx6TxF5eFCAwoLQ' },
  { value: 'Kenton Towne', address: '1A2ATy1FEu5yQ9ZzghPLsRckPQ7XLmq5MJQYcTvGnxGvCho' },
  { value: 'Therese Wunsch', address: '1bAVKRsNUbq1Qmvj7Cemkncjo17WgyWAusCFZQdUfeHSTYj' },
];

const options = data.map((d, index) => ({
  id: index.toString(),
  value: d.value,
  element: d.value,
}));

const customOptions = data.map((d, index) => ({
  id: index.toString(),
  value: d.value,
  element: (
    <div className="flex items-center gap-x-2.5">
      <Identicon address={d.address} background={false} size={24} canCopy={false} />
      <p>{d.value}</p>
    </div>
  ),
}));

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Select an option',
  options,
  onChange: () => {},
};

export const Selected = Template.bind({});
Selected.args = {
  placeholder: 'Select an option',
  value: options[1].id,
  options,
  onChange: () => {},
};

export const Large = Template.bind({});
Large.args = {
  placeholder: 'Select an option',
  value: options[1].id,
  options,
  weight: 'lg',
  onChange: () => {},
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  placeholder: 'Select an option',
  label: 'Payout account',
  options,
  weight: 'lg',
  onChange: () => {},
};

export const Custom = Template.bind({});
Custom.args = {
  placeholder: 'Select an option',
  label: 'Payout account',
  value: customOptions[2].id,
  options: customOptions,
  suffixElement: <Icon name="warnCutout" className="text-alert" size={20} />,
  weight: 'md',
  onChange: () => {},
};
