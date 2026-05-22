import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

type Props = {
  className?: string;
};

export const DraftIcon = ({ className }: Props) => (
  <div className={cnTw('flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-icon-accent/15', className)}>
    <Icon name="document" size={16} className="text-icon-accent" />
  </div>
);
