import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon, Identicon } from '@renderer/components/ui';
import Select from './Select';

export default {
  title: 'Select',
  component: Select,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Select>;

const Template: ComponentStory<typeof Select> = (args) => <Select {...args} />;

const data = [
  { value: 'Durward Reynolds', address: '13mK8AssyPekT5cFuYQ7ijKNXcjHPq8Gnx6TxF5eFCAwoLQ' },
  { value: 'Kenton Towne', address: '1A2ATy1FEu5yQ9ZzghPLsRckPQ7XLmq5MJQYcTvGnxGvCho' },
  { value: 'Therese Wunsch', address: '1bAVKRsNUbq1Qmvj7Cemkncjo17WgyWAusCFZQdUfeHSTYj' },
];

const options = data.map((d, index) => ({
  id: index.toString(),
  value: d.value,
  element: (
    <div className="flex items-center gap-x-2.5">
      <Identicon address={d.address} background={false} size={34} canCopy={false} />
      <p>{d.value}</p>
    </div>
  ),
}));

export const Medium = Template.bind({});
Medium.args = {
  placeholder: 'Select options',
  summary: 'Summary',
  options: [
    { id: '0', value: 'test_1', element: 'test_1' },
    { id: '1', value: 'test_2', element: 'test_2' },
    { id: '2', value: 'test_3', element: 'test_3' },
  ],
};

export const Large = Template.bind({});
Large.args = {
  placeholder: 'Select options',
  summary: 'Summary',
  suffix: <Icon name="warnCutout" className="text-alert" />,
  options,
  weight: 'lg',
};

export const PreSelected = Template.bind({});
PreSelected.args = {
  placeholder: 'Select options',
  summary: 'Summary',
  activeIds: [options[0].id, options[2].id],
  options,
};
