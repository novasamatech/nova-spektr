import { useCallback } from 'react';

const SCROLL_OFFSET = 20;

export const useScroll = () => {
  const findScrollContainer = useCallback((element: Element): Element | null => {
    /*

    TODO: Implement proper anchoring logic

    */

    return (
      element.closest('[data-radix-scroll-area-viewport]') ||
      element.closest('.scrollArea') ||
      element.closest('[data-scroll-area-viewport]')
    );
  }, []);

  const scrollToElement = useCallback((element: Element, scrollContainer: Element): void => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;

    scrollContainer.scrollTo({
      top: elementTop - SCROLL_OFFSET,
      behavior: 'smooth',
    });
  }, []);

  const scrollToSection = useCallback(
    (sectionId: string): void => {
      const element = document.getElementById(sectionId);
      if (!element) {
        console.warn('Section element not found:', sectionId);
        return;
      }

      const scrollContainer = findScrollContainer(element);
      if (!scrollContainer) {
        console.warn('Scroll container not found for section:', sectionId);
        return;
      }

      scrollToElement(element, scrollContainer);
    },
    [findScrollContainer, scrollToElement],
  );

  const scrollToMatch = useCallback(
    (sectionId: string, matchIndex: number): void => {
      const sectionElement = document.getElementById(sectionId);
      if (!sectionElement) {
        console.warn('Section element not found:', sectionId);
        return;
      }

      const scrollContainer = findScrollContainer(sectionElement);
      if (!scrollContainer) {
        console.warn('Scroll container not found for section:', sectionId);
        return;
      }

      // Find the specific highlighted span
      const highlightedSpans = sectionElement.querySelectorAll('span[data-match-index]');
      const targetSpan = Array.from(highlightedSpans).find(span => {
        const spanMatchIndex = parseInt(span.getAttribute('data-match-index') || '-1');
        return spanMatchIndex === matchIndex;
      });

      if (targetSpan) {
        scrollToElement(targetSpan, scrollContainer);
      } else {
        // Fallback to scrolling to the section
        scrollToElement(sectionElement, scrollContainer);
      }
    },
    [findScrollContainer, scrollToElement],
  );

  return {
    scrollToSection,
    scrollToMatch,
  };
};
