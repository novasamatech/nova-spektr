import { PropsWithChildren, ReactNode, useEffect } from 'react';

import DownImg from '@renderer/assets/images/chevron/down.svg';
import UpImg from '@renderer/assets/images/chevron/up.svg';
import { SortType, Source } from './common/types';
import { useTableContext } from './TableContext';

export const TableHeader = ({ children }: PropsWithChildren) => {
  return (
    <thead className="bg-white rounded-2lg py-2 pl-4 pr-11 border-b border-shade-5 sticky top-0 z-10">
      <tr>{children}</tr>
    </thead>
  );
};

const IMG_VARIANTS: Record<SortType, string | null> = {
  [SortType.NONE]: null,
  [SortType.ASC]: UpImg,
  [SortType.DESC]: DownImg,
};

type ColumnProps = {
  dataKey?: string;
  align?: 'left' | 'right';
  classname?: string;
};
export const TableColumn = ({ dataKey = '', align = 'left', classname, children }: PropsWithChildren<ColumnProps>) => {
  const { sorting, addNewSorting, updateSorting } = useTableContext();

  useEffect(() => {
    if (!dataKey) return;

    addNewSorting(dataKey);
  }, []);

  const image = IMG_VARIANTS[sorting[dataKey]?.type] || null;

  return (
    <th className={classname}>
      <button className="flex items-center gap-x-2.5" type="button" onClick={() => updateSorting(dataKey)}>
        {children}
        {image && <img src={image} alt="" width={22} height={22} />}
      </button>
    </th>
  );
};

// <div className="flex items-center ">
//   <Checkbox checked={allSelected} onChange={onSelectAll} />
//   <p className="text-2xs font-bold uppercase text-neutral-variant ml-2.5 mr-auto">
//     {t('staking.overview.accountTableHeader')}
//   </p>
//   <p className="pl-3 w-[150px] text-2xs font-bold uppercase text-neutral-variant text-right">
//     {t('staking.overview.rewardsTableHeader')}
//   </p>
//   <div className="pl-3 w-[150px]">
//     <button type="button" className="flex gap-x-1 ml-auto text-neutral-variant" onClick={setListSorting}>
//       <p className="text-2xs font-bold uppercase">{t('staking.overview.stakeTableHeader')}</p>
//       <Icon name={sortType === 'DESC' ? 'down' : 'up'} size={12} />
//     </button>
//   </div>
// </div>

type BodyProps = {
  children: (data: Source) => ReactNode;
};
export const TableBody = ({ children }: BodyProps) => {
  const { dataSource } = useTableContext();

  return <tbody>{dataSource.map((source) => children(source))}</tbody>;
};

export const TableRow = ({ children }: PropsWithChildren) => {
  return <tr>{children}</tr>;
};

export const TableCell = ({ children }: PropsWithChildren) => {
  return <td>{children}</td>;
};
