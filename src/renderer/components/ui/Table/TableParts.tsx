import cn from 'classnames';
import { Children, cloneElement, PropsWithChildren, ReactElement, ReactNode, useEffect } from 'react';

import { Checkbox, Icon } from '@renderer/components/ui';
import { Alignment, AnyRecord, IndexKey, SortType } from './common/types';
import { useTableContext } from './TableContext';

export const TableHeader = ({ children }: PropsWithChildren) => {
  const { allRowsSelected, selectedKeys, selectAll } = useTableContext();

  return (
    <thead className="bg-white border-b border-shade-5">
      {selectedKeys ? (
        <tr className="h-10">
          <th className="pl-4 pr-1 w-5 rounded-tl-2lg">
            <Checkbox checked={allRowsSelected} onChange={selectAll} />
          </th>
          {children}
        </tr>
      ) : (
        <tr className="h-10">{children}</tr>
      )}
    </thead>
  );
};

export type ColumnProps = {
  dataKey: string;
  align?: Alignment;
  sortable?: boolean;
  defaultSort?: 'asc' | 'desc';
  width?: number;
  classname?: string;
};
export const TableColumn = ({
  dataKey,
  align = 'right',
  sortable = false,
  defaultSort,
  width,
  classname,
  children,
}: PropsWithChildren<ColumnProps>) => {
  const { sortConfig, addSortingConfig, updateSortingOrder } = useTableContext();

  useEffect(() => {
    addSortingConfig({ dataKey, align, sortable, sortType: defaultSort as SortType });
  }, []);

  if (!sortable) {
    return (
      <th
        className={cn('px-1 first:pl-4 first:rounded-tl-2lg last:pr-4 last:rounded-tr-2lg', classname)}
        style={{ width }}
      >
        <div className={cn('w-max text-neutral-variant', align === 'left' ? 'mr-auto' : 'ml-auto')}>
          <div className="text-2xs font-bold uppercase">{children}</div>
        </div>
      </th>
    );
  }

  const sortIcon = [SortType.DESC, SortType.NONE].includes(sortConfig[dataKey]?.sortType) ? 'down' : 'up';
  const columnIsSorted = sortConfig[dataKey]?.sortType !== SortType.NONE;

  return (
    <th
      className={cn('px-1 first:pl-4 first:rounded-tl-2lg last:pr-4 last:rounded-tr-2lg', classname)}
      style={{ width }}
    >
      <div className={cn('w-max text-neutral-variant', align === 'left' ? 'mr-auto' : 'ml-auto')}>
        <button className="flex items-center gap-x-2.5" type="button" onClick={() => updateSortingOrder(dataKey)}>
          <div className="text-2xs font-bold uppercase">{children}</div>
          <Icon className={cn(!columnIsSorted && 'opacity-50')} name={sortIcon} size={18} />
        </button>
      </div>
    </th>
  );
};

type BodyProps<T extends AnyRecord> = {
  children: (data: T) => ReactNode;
};
export const TableBody = <T extends AnyRecord>({ children }: BodyProps<T>) => {
  const { by, dataSource } = useTableContext<T>();

  return (
    <tbody>
      {dataSource.map((source) => {
        const item = children(source) as ReactElement<PropsWithChildren<_RowProps>>;

        return cloneElement(item, { dataKey: source[by] });
      })}
    </tbody>
  );
};

type RowProps = {
  selectable?: boolean;
};
type _RowProps = {
  dataKey: IndexKey;
};
export const TableRow = ({ selectable = true, children, ...props }: PropsWithChildren<RowProps>) => {
  const { sortConfig, selectedKeys, selectRow, excludeKey } = useTableContext();

  // eslint-disable-next-line react/prop-types
  const { dataKey } = props as _RowProps;
  const alignments = Object.values(sortConfig).map((config) => config.align);

  useEffect(() => {
    if (selectable) return;

    excludeKey(dataKey);
  }, []);

  return (
    <tr className="h-10 border-b border-shade-5 last:border-b-0">
      {selectedKeys && (
        <td className="pr-1 pl-4 w-5">
          <Checkbox
            checked={selectedKeys?.includes(dataKey)}
            disabled={!selectable}
            onChange={() => selectRow(dataKey)}
          />
        </td>
      )}
      {Children.map(children, (child, index) => {
        const item = child as ReactElement<PropsWithChildren<_CellProps>>;

        return cloneElement(item, { align: alignments[index] });
      })}
    </tr>
  );
};

type _CellProps = {
  align: Alignment;
};
export const TableCell = ({ children, ...props }: PropsWithChildren) => {
  const { align } = props as _CellProps;

  return (
    <td className="px-1 first:pl-4 last:pr-4">
      <div className={cn('w-max', align === 'left' ? 'mr-auto' : 'ml-auto')}>{children}</div>
    </td>
  );
};
