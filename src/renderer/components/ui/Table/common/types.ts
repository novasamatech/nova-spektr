export type IndexKey = string;

export type AnyRecord = {
  [key: string]: any;
};

export const enum SortType {
  ASC = 'asc',
  DESC = 'desc',
  NONE = 'none',
}

export type Alignment = 'left' | 'right';

export type ColumnConfig = {
  dataKey: string;
  align: Alignment;
  sortType: SortType;
  sortable: boolean | ((a: any, b: any) => number);
};

export type SortConfig = Record<string, ColumnConfig>;
