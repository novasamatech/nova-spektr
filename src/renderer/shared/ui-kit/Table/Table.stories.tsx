import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';

import { type Column, type TableSort, Table } from './Table';

type SampleData = {
  id: number;
  name: string;
  rank: number;
  status: 'active' | 'inactive';
  joinDate: string;
};

const sampleData: SampleData[] = [
  { id: 1, name: 'Alice Johnson', rank: 3, status: 'active', joinDate: '2023-01-15' },
  { id: 2, name: 'Bob Smith', rank: 2, status: 'active', joinDate: '2023-03-22' },
  { id: 3, name: 'Charlie Brown', rank: 4, status: 'inactive', joinDate: '2022-11-08' },
  { id: 4, name: 'Diana Prince', rank: 1, status: 'active', joinDate: '2023-06-10' },
];

const columns: Column<SampleData>[] = [
  {
    key: 'id',
    title: 'ID',
    sortable: true,
    width: '80px',
  },
  {
    key: 'name',
    title: 'Name',
    sortable: true,
    width: '200px',
  },
  {
    key: 'rank',
    title: 'Rank',
    sortable: true,
    width: '100px',
    render: value => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        Rank {value}
      </span>
    ),
  },
  {
    key: 'status',
    title: 'Status',
    sortable: true,
    width: '120px',
    render: value => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    key: 'joinDate',
    title: 'Join Date',
    sortable: true,
    width: '150px',
  },
];

const meta: Meta<typeof Table<SampleData>> = {
  title: 'Design System/kit/Table',
  component: Table,
  args: {
    columns,
    data: sampleData,
  },
};

export default meta;

type Story = StoryObj<typeof Table<SampleData>>;

export const Default: Story = {};

export const DefaultSort: Story = {
  args: {
    defaultSort: { column: 'rank', direction: 'asc' },
  },
};

export const ControlledSorting: Story = {
  render(args) {
    const [sort, setSort] = useState<TableSort | null>({ column: 'name', direction: 'asc' });

    const sortedData = useMemo(() => {
      if (!sort) return sampleData;

      const key = columns.find(column => String(column.key) === sort.column)?.key;
      if (!key) return sampleData;

      return [...sampleData].sort((a, b) => {
        const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;

        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }, [sort]);

    return <Table {...args} data={sortedData} sort={sort} onSortChange={setSort} />;
  },
};

export const RowStates: Story = {
  args: {
    getRowKey: item => String(item.id),
    rowProps: item => ({
      disabled: item.status === 'inactive',
      selected: item.id === 2,
    }),
    onRowClick: item => {
      // eslint-disable-next-line no-console
      console.log('row click', item.id);
    },
  },
};

export const WithCustomRender: Story = {
  args: {
    columns: [
      ...columns,
      {
        key: 'name',
        title: 'Actions',
        sortable: false,
        width: '120px',
        render: () => (
          <button className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">View</button>
        ),
      },
    ],
  },
};
