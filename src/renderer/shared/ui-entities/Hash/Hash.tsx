import { Truncate } from './Truncate';

type Props = {
  value: string;
  variant: 'full' | 'truncate';
  testId?: string;
};

export const Hash = ({ value, variant, testId = 'Hash' }: Props) => {
  return (
    <span className="w-full text-inherit transition-colors" data-testid={testId}>
      {variant === 'truncate' ? <Truncate text={value} /> : <span className="break-all">{value}</span>}
    </span>
  );
};
