import { useEffect } from 'react';

type IntersectionObserverCallback = (entry: IntersectionObserverEntry) => void;

const elementCallbacks = new Map<Element, IntersectionObserverCallback>();

const observer = new IntersectionObserver(
  entries => {
    for (const entry of entries) {
      const callback = elementCallbacks.get(entry.target);
      if (callback) {
        callback(entry);
      }
    }
  },
  {
    rootMargin: '200px',
    threshold: 0.1,
  },
);

export function useIntersectionObserver(element: Element | null, callback: IntersectionObserverCallback) {
  useEffect(() => {
    if (!element) return;

    elementCallbacks.set(element, callback);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      elementCallbacks.delete(element);
    };
  }, [element]);
}
