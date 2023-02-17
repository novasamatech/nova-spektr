import { ComponentStory, ComponentMeta } from '@storybook/react';

import Table from './Table';

export default {
  title: 'Table',
  component: Table,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="max-w-[800px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Table>;

const Template: ComponentStory<typeof Table> = (args) => <Table {...args} />;

type Struct = {
  name: string;
  age: number;
  address: string;
};
const dataSource: Struct[] = [
  { name: 'Mike', age: 32, address: '20 Downing Street' },
  { name: 'John', age: 42, address: '10 Downing Street' },
];

export const Primary = Template.bind({});
Primary.args = {
  by: 'name',
  dataSource,
  selectedKeys: ['1'],
  onSelect: console.log,
  children: (
    <>
      <Table.Header>
        <Table.Column dataKey="name" align="left">
          Name
        </Table.Column>
        <Table.Column dataKey="age" width={200}>
          Age
        </Table.Column>
        <Table.Column dataKey="address" width={200}>
          Address
        </Table.Column>
        <Table.Column dataKey="actions" width={50} />
      </Table.Header>
      <Table.Body<Struct>>
        {(source) => (
          <Table.Row key={source.name}>
            <Table.Cell>{source.name}</Table.Cell>
            <Table.Cell>{source.age}</Table.Cell>
            <Table.Cell>{source.address}</Table.Cell>
            <Table.Cell>•••</Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </>
  ),
};
