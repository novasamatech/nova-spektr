import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from '../../Icon/Icon';
import { Identicon } from '../../Identicon/Identicon';
import { Combobox } from './Combobox';

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
} as ComponentMeta<typeof Combobox>;

const Template: ComponentStory<typeof Combobox> = (args) => <Combobox {...args} />;

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

export const WithLabel = Template.bind({});
WithLabel.args = {
  placeholder: 'Select an option',
  label: 'Payout account',
  options,
  onChange: () => {},
};

export const Custom = Template.bind({});
Custom.args = {
  placeholder: 'Select an option',
  label: 'Payout account',
  value: customOptions[2],
  options: customOptions,
  suffixElement: <Icon name="warnCutout" className="text-alert right-2 top-[9px] absolute" size={16} />,
  onChange: () => {},
};
