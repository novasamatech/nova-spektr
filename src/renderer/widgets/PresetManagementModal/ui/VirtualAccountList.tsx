import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type AccountEntry } from '@/aggregates/account-presets';

type Props = {
  entries: AccountEntry[];
  estimateSize?: number;
  className?: string;
  renderRow: (entry: AccountEntry) => ReactNode;
};

export const VirtualAccountList = ({ entries, estimateSize = 40, className, renderRow }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    getItemKey: (index) => entries[index]?.id ?? `idx-${index}`,
  });

  return (
    <div ref={scrollRef} className={cnTw('overflow-y-auto rounded-sm', className)}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const entry = entries[row.index];
          if (!entry) return null;

          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
              }}
            >
              {renderRow(entry)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
