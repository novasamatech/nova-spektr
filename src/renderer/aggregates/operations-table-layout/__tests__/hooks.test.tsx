import { act, renderHook } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationColumnVisibility } from '../hooks';
import { INITIATOR_COLUMN_MEDIA_QUERY } from '../layout';
import { operationsTableLayoutModel } from '../model';

type ChangeListener = () => void;

// jsdom has no `matchMedia`; the hook caches the first MediaQueryList it gets,
// so one stub object serves every test and its `matches` is flipped per case.
const initiatorMedia = {
  media: INITIATOR_COLUMN_MEDIA_QUERY,
  matches: false,
  listeners: new Set<ChangeListener>(),
  addEventListener: vi.fn((_type: 'change', listener: ChangeListener) => {
    initiatorMedia.listeners.add(listener);
  }),
  removeEventListener: vi.fn((_type: 'change', listener: ChangeListener) => {
    initiatorMedia.listeners.delete(listener);
  }),
};
const matchMedia = vi.fn((query: string) => {
  expect(query).toBe(INITIATOR_COLUMN_MEDIA_QUERY);

  return initiatorMedia;
});

const renderVisibility = (overrides: Partial<Record<'initiator', boolean>> = {}) => {
  const scope = fork({ values: [[operationsTableLayoutModel.$visibilityOverrides, overrides]] });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return renderHook(() => useOperationColumnVisibility(), { wrapper });
};

describe('useOperationColumnVisibility', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true, writable: true });
  });

  beforeEach(() => {
    initiatorMedia.matches = false;
    initiatorMedia.listeners.clear();
    initiatorMedia.addEventListener.mockClear();
    initiatorMedia.removeEventListener.mockClear();
  });

  it('hides Initiator by default below the breakpoint', () => {
    const { result } = renderVisibility();

    expect(result.current.initiator).toBe(false);
    expect(result.current).toMatchObject({
      value: true,
      submitter: true,
      description: true,
      status: true,
      actions: true,
    });
  });

  it('shows Initiator by default above the breakpoint', () => {
    initiatorMedia.matches = true;
    const { result } = renderVisibility();

    expect(result.current.initiator).toBe(true);
  });

  it('a user override wins on either side of the breakpoint', () => {
    expect(renderVisibility({ initiator: true }).result.current.initiator).toBe(true);

    initiatorMedia.matches = true;
    expect(renderVisibility({ initiator: false }).result.current.initiator).toBe(false);
  });

  it('follows the breakpoint while mounted and stops listening on unmount', () => {
    const { result, unmount } = renderVisibility();
    expect(initiatorMedia.listeners.size).toBe(1);

    const [onChange] = initiatorMedia.listeners;
    initiatorMedia.matches = true;
    act(() => onChange?.());
    expect(result.current.initiator).toBe(true);

    unmount();
    expect(initiatorMedia.removeEventListener).toHaveBeenCalledWith('change', onChange);
    expect(initiatorMedia.listeners.size).toBe(0);
  });
});
