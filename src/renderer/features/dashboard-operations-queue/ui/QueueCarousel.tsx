import { useCallback, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { type Draft } from '@/domains/backend';
import { type QueueItem } from '../model/queue-model';

import { DraftCard } from './DraftCard';
import { MultisigCard } from './MultisigCard';

type Props = {
  items: QueueItem[];
  showDots: boolean;
  onSkip: (key: string) => void;
  onSubmitDraft: (draft: Draft) => void;
};

export const QueueCarousel = ({ items, showDots, onSkip, onSubmitDraft }: Props) => {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[index];
    if (child instanceof HTMLElement) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length === 0) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const child = track.children[i];
      if (!(child instanceof HTMLElement)) continue;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }
    setActiveIndex(nearest);
  }, []);

  const go = (delta: number) => {
    const next = Math.min(Math.max(activeIndex + delta, 0), items.length - 1);
    scrollToIndex(next);
  };

  return (
    <div className="relative">
      {items.length > 1 && (
        <button
          type="button"
          aria-label={t('dashboard.operationsQueue.previous')}
          disabled={activeIndex === 0}
          className={cnTw(
            'absolute top-1/2 left-0 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-block-background-default p-1.5 shadow-card-shadow',
            'disabled:cursor-default disabled:opacity-30',
          )}
          onClick={() => go(-1)}
        >
          <Icon name="arrowLeft" size={16} />
        </button>
      )}

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-x-3 overflow-x-auto scroll-smooth px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
      >
        {items.map((item) => (
          <div key={item.key} className="min-h-[150px] w-[calc(100%-3rem)] shrink-0 snap-center">
            {item.kind === 'draft' ? (
              <DraftCard draft={item.draft} onSkip={() => onSkip(item.key)} onSubmit={onSubmitDraft} />
            ) : (
              <MultisigCard operation={item.operation} onSkip={() => onSkip(item.key)} />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <button
          type="button"
          aria-label={t('dashboard.operationsQueue.next')}
          disabled={activeIndex === items.length - 1}
          className={cnTw(
            'absolute top-1/2 right-0 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-block-background-default p-1.5 shadow-card-shadow',
            'disabled:cursor-default disabled:opacity-30',
          )}
          onClick={() => go(1)}
        >
          <Icon name="arrowRight" size={16} />
        </button>
      )}

      {showDots && items.length > 1 && (
        <div className="mt-2 flex justify-center gap-x-1.5">
          {items.map((item, index) => (
            <span
              key={item.key}
              className={cnTw(
                'h-1.5 rounded-full transition-all',
                index === activeIndex ? 'w-4 bg-icon-accent' : 'w-1.5 bg-icon-default opacity-40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
