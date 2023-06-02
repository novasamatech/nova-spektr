export type RadioOption<T extends any = any> = {
  id: string;
  value: T;
  title: string;
};

export type RadioResult<T extends any = any> = {
  id: string;
  value: T;
};
