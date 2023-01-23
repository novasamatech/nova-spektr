export type IndexKey = string | number;

export type Source = {
  key: IndexKey;
  [key: string]: string | number;
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
  }
>;
