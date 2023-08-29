import type { Meta, StoryObj } from '@storybook/react';
import noop from 'lodash/noop';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Identicon } from '../../Identicon/Identicon';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design system/Inputs/Select',
  component: Select,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Select>;

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
};

export const Selected: Story = {
  render: () => <Select placeholder="Select an option" selectedId={options[1].id} options={options} onChange={noop} />,
};

export const WithLabel: Story = {
  render: () => <Select placeholder="Select an option" label="Payout account" options={options} onChange={noop} />,
};

export const Custom: Story = {
  render: () => (
    <Select
      placeholder="Select an option"
      label="Payout account"
      selectedId={customOptions[2].id}
      options={customOptions}
      onChange={noop}
    />
  ),
};
