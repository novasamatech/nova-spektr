import { renderHook } from '@testing-library/react';

import { useClickOutside } from '../useClickOutside';

const createDocumentListenersMock = () => {
  const listeners: Record<string, EventListener> = {};
  const handler = (element: HTMLElement, event: string): void =>
    listeners[event]?.({ target: element } as unknown as Event);

  document.addEventListener = jest.fn((event: string, callback: EventListener) => {
    listeners[event] = callback;
  });

  document.removeEventListener = jest.fn((event: string) => {
    delete listeners[event];
  });

  return {
    mouseDown: (element: HTMLElement) => handler(element, 'mousedown'),
    click: (element: HTMLElement) => handler(element, 'click'),
  };
};

describe('hooks/useClickOutside', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call handler', () => {
    const handler = jest.fn();
    const fireDocumentEvent = createDocumentListenersMock();

    const ref = document.createElement('div');
    ref.setAttribute('id', 'refId');
    document.body.appendChild(ref);

    const { unmount } = renderHook(() => useClickOutside([{ current: ref }], handler));

    expect(document.addEventListener).toHaveBeenCalled();
    fireDocumentEvent.mouseDown(document.body);
    expect(handler).toBeCalledTimes(1);
    unmount();
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  test('should not call handler for the same ref', () => {
    const handler = jest.fn();
    const fireDocumentEvent = createDocumentListenersMock();

    const ref = document.createElement('div');
    ref.setAttribute('id', 'refId');
    document.body.appendChild(ref);

    renderHook(() => useClickOutside([{ current: ref }], handler));
    fireDocumentEvent.mouseDown(ref);
    expect(handler).not.toHaveBeenCalled();
  });

  test('should not call handler if there is no ref', () => {
    const handler = jest.fn();
    const fireDocumentEvent = createDocumentListenersMock();

    const ref = document.createElement('div');
    ref.setAttribute('id', 'refId');
    document.body.appendChild(ref);

    renderHook(() => useClickOutside([{ current: null }], handler));
    fireDocumentEvent.mouseDown(document.body);
    expect(handler).not.toHaveBeenCalled();
  });
});
