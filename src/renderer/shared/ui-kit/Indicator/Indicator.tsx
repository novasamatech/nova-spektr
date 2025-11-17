import { cnTw } from '@/shared/lib/utils';

export type IndicatorProps = {
  active: boolean;
};

export const Indicator = ({ active }: IndicatorProps) => {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-white">
      <div
        className={cnTw(
          'h-2 w-2 rounded-full shadow-[0_0_0_1.5px]',
          active
            ? 'bg-text-positive shadow-badge-green-background-default'
            : 'bg-chip-text shadow-secondary-button-background',
        )}
      />
    </div>
  );
};
