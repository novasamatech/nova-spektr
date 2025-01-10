import '@testing-library/jest-dom/vitest';

import { default as crypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '42',
    getRandomValues: (arr) => crypto.randomFillSync(arr),
  },
});

Object.defineProperty(global, 'jest', {
  value: {
    mock: vi.mock,
    restoreAllMocks: vi.resetAllMocks,
    clearAllMocks: vi.clearAllMocks,
    clearAllTimers: vi.clearAllTimers,
    useFakeTimers: vi.useFakeTimers,
    runAllTimersAsync: vi.runAllTimersAsync,
    runOnlyPendingTimersAsync: vi.runOnlyPendingTimersAsync,
    spyOn: vi.spyOn,
    fn: vi.fn,
  },
});

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
