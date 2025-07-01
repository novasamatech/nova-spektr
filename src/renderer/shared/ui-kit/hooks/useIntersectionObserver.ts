import { useEffect, useState } from 'react';

const elementCallbacks = new Map<Element, (isIntersecting: boolean) => void>();

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const callback = elementCallbacks.get(entry.target);
      if (callback) {
        callback(entry.isIntersecting);
      }
    }
  },
  {
    rootMargin: '200px',
    threshold: 0.1,
  },
);

export function useIntersectionObserver(element: Element | null) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!element) return;

    elementCallbacks.set(element, setIsIntersecting);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      elementCallbacks.delete(element);
    };
  }, [element]);

  return isIntersecting;
}
