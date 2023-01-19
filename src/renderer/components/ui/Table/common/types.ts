export type Source = {
  [key: string]: string | number;
};

export const enum SortType {
  ASC = 'asc',
  DESC = 'desc',
  NONE = 'none',
}

export type SortConfig = Record<string, { dataKey: string; type: SortType }>;
