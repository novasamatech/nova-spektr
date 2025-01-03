import { type RefObject, useEffect } from 'react';

import { useLooseRef } from '@/shared/lib/hooks';

type Callbacks = Map<Element, Set<ResizeObserverCallback>>;

type ResizeObserverCallback = (entry: ResizeObserverEntry) => void;
type ResizeObserverSingleton = {
  callbacks: Callbacks;
  subscribe: (target: Element, callback: ResizeObserverCallback) => void;
  unsubscribe: (target: Element, callback: ResizeObserverCallback) => void;
};

let observerSingleton: ResizeObserverSingleton;

const getObserverSingleton = (
  callbacks: Callbacks,
  onSubscribe: (target: Element) => void,
  onUnsubscribe: (target: Element) => void,
): ResizeObserverSingleton => {
  return {
    callbacks,
    subscribe: (target, callback) => {
      onSubscribe(target);

      const cbs = callbacks.get(target) || new Set<ResizeObserverCallback>();
      cbs.add(callback);
      callbacks.set(target, cbs);
    },
    unsubscribe: (target, callback) => {
      const cbs = callbacks.get(target);

      if (cbs) {
        onUnsubscribe(target);
        cbs.delete(callback);
        if (!cbs.size) {
          callbacks.delete(target);
        }
      }
    },
  };
};

const getResizeObserver = (): ResizeObserverSingleton => {
  if (observerSingleton) return observerSingleton;

  const callbacks = new Map<Element, Set<ResizeObserverCallback>>();
  let activeTask: ReturnType<typeof requestAnimationFrame> | null = null;
  let accumulatedEntries: ResizeObserverEntry[] = [];

  const startEntriesProcessing = () => {
    if (activeTask) {
      return;
    }

    activeTask = requestAnimationFrame(() => {
      const triggered = new Set<Element>();
      for (const entry of accumulatedEntries) {
        if (triggered.has(entry.target)) continue;
        triggered.add(entry.target);

        const fns = callbacks.get(entry.target);
        if (fns) {
          for (const fn of fns) {
            fn(entry);
          }
        }
      }
      accumulatedEntries.length = 0;
      activeTask = null;
    });
  };

  const observer = new ResizeObserver(entries => {
    accumulatedEntries = accumulatedEntries.concat(entries);
    startEntriesProcessing();
  });

  observerSingleton = getObserverSingleton(
    callbacks,
    target => observer.observe(target),
    target => observer.unobserve(target),
  );

  return observerSingleton;
};

export const useResizeObserver = <T extends Element>(
  reference: RefObject<T> | T | null | undefined,
  callback: ResizeObserverCallback,
): void => {
  const observer = getResizeObserver();
  const cb = useLooseRef(callback);

  useEffect(() => {
    let subscribed = true;

    const target = reference && 'current' in reference ? reference.current : reference;
    if (!target) return;

    const handler: ResizeObserverCallback = (...args) => {
      if (subscribed) {
        cb()(...args);
      }
    };

    observer.subscribe(target, handler);

    return () => {
      subscribed = false;
      observer.unsubscribe(target, handler);
    };
  }, [reference, observer]);
};
