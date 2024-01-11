import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Identicon } from '../../Identicon/Identicon';
import { MultiSelect } from './MultiSelect';

export default {
  title: 'Redesign/MultiSelect',
  component: MultiSelect,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 w-[280px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof MultiSelect>;

const Template: ComponentStory<typeof MultiSelect> = (args) => <MultiSelect {...args} />;

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
  value: d,
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
  selectedIds: [options[0].id, options[1].id],
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
  selectedIds: [customOptions[2].id],
  options: customOptions,
  onChange: () => {},
};
