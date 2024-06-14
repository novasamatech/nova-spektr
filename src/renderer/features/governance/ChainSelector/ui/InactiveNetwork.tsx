import { InactiveNetwork as Inactive } from '@entities/network';

type Props = {
  className?: string;
};

export const InactiveNetwork = ({ className }: Props) => {
  return <Inactive active={false} className={className} />;
};
