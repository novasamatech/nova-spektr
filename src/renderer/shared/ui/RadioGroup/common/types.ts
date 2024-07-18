export type RadioOption<T = any> = {
  id: string;
  value: T;
  title: string;
  description?: string;
};

export type RadioResult<T = any> = {
  id: string;
  value: T;
};
