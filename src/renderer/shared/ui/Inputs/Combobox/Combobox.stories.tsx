import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Icon } from '../../Icon/Icon';
import { Identicon } from '../../Identicon/Identicon';
import { Combobox } from './Combobox';

const meta: Meta<typeof Combobox> = {
  title: 'Design system/Inputs/Combobox',
  component: Combobox,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const UiOptions: Story['argTypes'] = {
  className: { control: false },
  suffixElement: { control: false },
  onChange: { control: false },
};

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
      <Identicon address={d.address} background={false} size={20} canCopy={false} />
      <p>{d.value}</p>
    </div>
  ),
}));

export const Playground: Story = {
  args: {
    placeholder: 'Select an option',
    options,
    onChange: () => {},
  },
  argTypes: UiOptions,
};

export const WithLabel: Story = {
  render: () => <Combobox placeholder="Select an option" label="Payout account" options={options} onChange={noop} />,
};

export const Custom: Story = {
  render: () => (
    <Combobox
      placeholder="Select an option"
      label="Payout account"
      value={customOptions[2]}
      options={customOptions}
      suffixElement={<Icon name="status-warning" className="text-text-warning right-2 absolute" size={16} />}
      onChange={noop}
    />
  ),
};
