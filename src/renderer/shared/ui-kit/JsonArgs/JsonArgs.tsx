import { memo } from 'react';

import { Json } from '../Json/Json';

type Props = {
  value: object;
};

const sortKeys = (a: string) => {
  if (a === 'section') return -1;
  if (a === 'method') return -1;

  return 0;
};

export const JsonArgs = memo(({ value }: Props) => {
  return <Json value={value} name="operation" sortKeys={sortKeys} />;
});
