export type IndexKey = string;

export type AnyRecord = {
  [key: string]: any;
};

export const enum SortType {
  ASC = 'asc',
  DESC = 'desc',
}

export type Alignment = 'left' | 'right';

export type SortConfig = Record<
  string,
  {
    dataKey: string;
    active: boolean;
    type: SortType;
    align: 'left' | 'right';
    sort: boolean;
  }
>;
