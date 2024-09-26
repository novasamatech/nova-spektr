export type RadioOption<T> = {
  id: string;
  value: T;
  title: string;
  description?: string;
};

export type RadioResult<T> = {
  id: string;
  value: T;
};
